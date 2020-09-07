# Import modules
from flask import Flask, render_template, g, request, session
import flask_sijax
from werkzeug.utils import secure_filename
import os
import json
import uuid
from collections import OrderedDict
import time


def update_code_dialog(obj_response, app, filename):
    """
    Update the code dialog.

    Args:
        obj_response: Sijax object response.
        app: Sijax app.
        filename: Name of the selected json file.
    """
    with open(os.path.join(app.config["UPLOAD_FOLDER"], filename), "r") as f:
        for count, line in enumerate(f.readlines()):
            obj_response.html_append("#json-code", "%d <span style='margin-left: %dpx'>%s</span><br>" % (count, 40 * line.count("\t"), line.strip()))


def update_temp(app, filename):
    """
    Update the temporary json file for the visualizer.

    Args:
        app: Sijax app.
        filename: Name of the selected json file.
            None if no json file is selected.
    """
    if filename:
        filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
        with open(filepath, "r") as readfile:
            with open(os.path.join(app.root_path, "temp.json"), "w") as writefile:
                for line in readfile:
                    writefile.write(line)
    else:
        with open(os.path.join(app.root_path, "temp.json"), "r+") as writefile:
            writefile.truncate(0)

def gen_id(marker, seed):
    """
    Generate a random id for use as a unique HTML id.

    Args:
        marker (str): A string to prepend to the random id to delineate the type of object
            and to ensure that the id does not start with a number.
        seed (str): A seed to use to generate the id.

    Returns:
        The id.
    """
    return marker + uuid.uuid5(uuid.NAMESPACE_DNS, seed).hex


def get_json_options():
    """
    Get the uploaded JSON file options.

    Returns:
        Dictionary with ids as keys and filenames as values for each file in the upload folder.
    """
    json_options = {gen_id("j", filename): filename for filename in os.listdir(app.config["UPLOAD_FOLDER"])}
    json_options["none"] = None
    return json_options


def to_float(val):
    """Parse numbers and lists of numbers as floats."""
    try:
        return float(val)
    except:
        try:
            return [float(item) for item in val]
        except:
            return val


class Event(object):
    """
    Event object.

    Args:
        name (str): Event name.
        data (dict): Event data.
        channels (list): List of channels for all events.

    Attributes:
        name (str): Event name.
        subevents (list): List of subevents associated with the event.
        blocks (dict): Dictionary with channels as keys and lists as values.
            Each list contains the relative length of the signal block for each subevent in the channel.
            Empty until the calc_block_lengths method is called.
        length (int): The relative length of the entire event.
            Zero until the calc_block_lengths method is called.
        channels (list): List of channels for all events.
        event_channels (list): List of channels for current event.
    """
    def __init__(self, name, data, channels, meta):
        self.name = name
        self.subevents = [[{key: to_float(value) for key, value in subevent.items()} for subevent in step] for step in data["subEvents"]]
        self.blocks = {}
        self.length = 0
        self.channels = channels
        self.event_channels = list(dict.fromkeys([subevent["channel"] for step in self.subevents for subevent in step]))
        self.has_values = False
        if meta["values"] == "true":
            self.has_values = True

    def calc_block_lengths(self):
        """Calculate the relative length of the signal block for each subevent."""
        indices = {ch: [] for ch in self.channels}
        prev_events = {ch: dict(eventType=None, channel=ch) for ch in self.channels}
        step_cnt = 0
        for i, step in enumerate(self.subevents):
            for j, subevent in enumerate(step):
                channel = subevent["channel"]
                # use parameters from last subevent on channel if same event type
                if subevent["eventType"] == prev_events[channel]["eventType"]:
                    self.subevents[i][j] = dict(prev_events[channel], **subevent)
                indices[channel] += [step_cnt]
                prev_events[channel] = subevent
            step_cnt += 1
        for channel in self.channels:
            if not indices[channel] or indices[channel][0] > 0:
                indices[channel] = [0] + indices[channel]
                self.subevents[0] += [dict(channel=channel, eventType="none")]
        self.blocks = {ch: [j - i for i, j in zip(ch_indices, ch_indices[1:] + [step_cnt + 1])] for ch, ch_indices in indices.items()}
        self.length = step_cnt + 1

    def create_blocks(self, obj_response):
        """
        Create signal blocks in the analysis app.

        Args:
            obj_response: Sijax object response.
        """
        for step in self.subevents:
            for subevent in step:
                length = self.blocks[subevent["channel"]].pop(0)
                obj_response.call("create_block", [subevent, length, self.name, self.has_values])


class SijaxUploadHandlers(object):
    """
    Handlers object encapsulating Sijax upload handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def upload_json(self, obj_response, files, form_values):
        """
        Upload a JSON file.

        Args:
            obj_response: Sijax object response.
            files: A list containing the Werkzeug FileStorage object for the uploaded file.
            form_values: Dictionary of form values. Unused here.
        """
        if "file" not in files:
            obj_response.alert("Upload unsuccessful.")
            return
        file_data = files["file"]
        filename = file_data.filename
        if not filename:
            obj_response.alert("Upload cancelled.")
        elif file_data.content_type != "application/json":
            obj_response.alert("'%s' is not a json file." % filename)
        elif filename != secure_filename(filename):
            obj_response.alert("File name '%s' is not secure." % filename)
        elif filename in os.listdir(app.config["UPLOAD_FOLDER"]):
            obj_response.alert("A json file '%s' has already been uploaded." % filename)
        else:
            file_data.save(os.path.join(app.config["UPLOAD_FOLDER"], filename))
            obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", filename), filename))
            obj_response.call("refresh_json_options")


class SijaxHandlers(object):
    """
    Handlers object encapsulating Sijax handlers.

    Encapsulation allows all handlers to be registered simultaneously.

    Args:
        app: Sijax app.

    Attributes:
        app: Sijax app.
    """
    def __init__(self, app):
        self.app = app

    def remove_json(self, obj_response, selected_json_id):
        """
        Remove the selected JSON file.

        Args:
            obj_response: Sijax object response.
            selected_json_id (str): Id of the selected JSON file.
        """
        filename = get_json_options()[selected_json_id]
        os.remove(os.path.join(app.config["UPLOAD_FOLDER"], filename))
        obj_response.call("refresh_json_options")

    def get_json(self, obj_response, file):
        """
        Update #jsonDisplay to contain the selected JSON input, if valid.

        Args:
            obj_response: Sijax object response.
            file (str): File name.
        """
        with open(os.path.join(self.app.config["UPLOAD_FOLDER"], file), "r") as json_file:
            try:
                textCallback = json.dumps(json.load(json_file), indent=2)
                obj_response.script('$("#jsonDisplay").attr("validity","True")')
            except ValueError as err:
                textCallback = "file is invalid JSON"
                obj_response.script('$("#jsonDisplay").attr("validity","False")')
            json_file.close()
        obj_response.html("#jsonDisplay", textCallback)
        json_file.close()

    def pass_json(self, obj_response, selected_json_id, page_name):
        """
        Calls uploadJson() to upload selected json file to #spreadsheet or #parameter.

        Args:
            obj_response: Sijax object response.
            file (str): File name.
        """
        global current_json_id
        current_json_id = selected_json_id
        if current_json_id:
            filename = get_json_options()[selected_json_id]
            if filename:
                with open(os.path.join(self.app.config["UPLOAD_FOLDER"], filename), "r") as json_file:
                    json_string = json.dumps(json.load(json_file))
                    if page_name == "spreadsheet":
                        obj_response.call('uploadJson', [json_string])
                    if page_name == "parameter":
                        obj_response.call('uploadJsonTemplate', [json_string])

    def update_vis(self, obj_response, selected_json_id):
        """
        Update the visualization window.

        Args:
            obj_response: Sijax object response.
            selected_json_id (str): Id of the selected JSON file.
        """
        filename = get_json_options()[selected_json_id]
        update_temp(self.app, filename)
        if filename:
            update_code_dialog(obj_response, self.app, filename)

    def save_json(self, obj_response, logic_json, file_name, temp):
        '''
        Saves #spreadsheet logic to a JSON file in "UPLOAD_FOLDER"

                Parameters:
                        logic_obj (application/json): #spreadsheet JSON file output
                        file_name (String): file_name
                        temp (bool): true if saving to temp.json
        '''
        #if file_name in os.listdir(app.config["UPLOAD_FOLDER"]):
        #    obj_response.alert("json file '%s' exists. Do you wish to overwrite?" % filename)
        data = logic_json["content"]
        file_name = file_name + ".json"
        groups = data.keys()
        #the columns (keys/event aspects) could also be loaded from config_file
        #but if col-reorder is enabled they must be loaded from the exported data
        columns = json.loads(data[list(groups)[0]][0])["header"]
        logic = {}
        for group in groups:
            logic[group] = {"subEvents": []}
            for event in data[group]:
                eventList = []
                subEventsObj = json.loads(event)["body"]
                for subEvent in subEventsObj:
                    subEventType = subEvent[2]
                    subColumns = config_json[subEventType].keys()
                    frmtSubEvent = {}
                    # the first two columns do not contain data
                    for key in subColumns:
                        columnIndex = columns.index(key)
                        frmtSubEvent[key] = subEvent[columnIndex]
                    eventList.append(frmtSubEvent)
                logic[group]["subEvents"].append(eventList)
        logic_json["content"] = logic
        if temp:
            file_folder = app.config["TEMP_FOLDER"]
        if not temp:
            file_folder = app.config["UPLOAD_FOLDER"]
        json_list = os.listdir(app.config["UPLOAD_FOLDER"])
        with open(os.path.join(file_folder, file_name), 'w') as file:
            try:
                json.dump(logic_json, file, indent=2)
                if not temp:
                    if file_name not in json_list:
                        obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", file_name), file_name))
                        obj_response.call("refresh_json_options")
            except Exception as err:
                print(err)


def show_signals(obj_response):
    """
    Display signals from temp.json.

    Args:
        obj_response: Sijax object response.
    """
    # Read JSON file
    with open(os.path.join(app.root_path, "temp.json"), "r") as f:
        json_obj = json.load(f, object_pairs_hook=OrderedDict)
    content = json_obj["content"]
    channels = list(dict.fromkeys([subevent["channel"] for event_data in content.values() for step in event_data["subEvents"] for subevent in step]))
    for channel in channels:
        obj_response.html_append("#ch-select", "<option val='" + channel + "'>" + channel + "</option>")
    for name, data in content.items():
        event = Event(name, data, channels, json_obj["meta"])
        event.calc_block_lengths()
        obj_response.call("add_event", [event.name, event.length])
        event.create_blocks(obj_response)


class SijaxCometHandlers(object):
    """
    Handlers object encapsulating Sijax comet handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

    def update(self, obj_response):
         """
         Check if selected JSON file in main page has changed and update visualization window if necessary.

         Args:
             obj_response: Sijax object response.
         """
         mtime = time.time()
         while True:
             filepath = os.path.join(self.app.root_path, "temp.json")
             if os.path.getmtime(filepath) != mtime:
                 mtime = os.path.getmtime(filepath)
                 if os.path.getsize(filepath) == 0:
                     obj_response.call("update", ["hide"])
                     yield obj_response
                 else:
                     obj_response.call("update", ["hide"])
                     yield obj_response
                     show_signals(obj_response)
                     obj_response.call("update", ["show"])
                     yield obj_response


def jsonProcess(config_json):
    event_config = {
        "types": list(config_json.keys()),
        "original": config_json
    }
    event_config["type_parameters"] = {}
    for type in config_json:
        event_config["type_parameters"][type] = list(config_json[type].keys())
    event_config["all_parameters"] = []
    for event in event_config["type_parameters"]:
        for parameter in event_config["type_parameters"][event]:
            event_config["all_parameters"].append(parameter)
    event_config["all_parameters"] = list(OrderedDict.fromkeys(event_config["all_parameters"]))
    # Column generation requires that eventType be the first parameter
    event_config["all_parameters"].remove("eventType")
    event_config["all_parameters"].insert(0, "eventType")
    return event_config

def create_app():
    """
    Create the flask app.

    Returns:
        The flask app.
    """
    app = Flask(__name__) # initialize the app.
    # configure flask
    app.config.update(
        SIJAX_STATIC_PATH=os.path.join('.', os.path.dirname(__file__), "static/js/sijax/"),
        SIJAX_JSON_URI="/static/js/sijax/json2.js",
        UPLOAD_FOLDER=os.path.join(app.root_path, "uploads"),
        TEMP_FOLDER= app.root_path
    )
    app.secret_key = b"\xa4\xfb3hXuN2G\xce\n\xe0\xcf,\x8d\xb6"
    flask_sijax.Sijax(app)  # initialize flask-sijax

    @flask_sijax.route(app, '/visualize')
    def visualize():

        if g.sijax.is_sijax_request:
            g.sijax.register_comet_object(SijaxCometHandlers(app))
            return g.sijax.process_request()
        return render_template("visualizer.html")

    @flask_sijax.route(app, '/')
    def main():
        """
        Render the main page.

        Returns:
            The rendered html template for the main page.
        """
        form_init_js = g.sijax.register_upload_callback("upload-json", SijaxUploadHandlers().upload_json)  # Register Sijax upload handlers
        if g.sijax.is_sijax_request:
            g.sijax.register_object(SijaxHandlers(app))
            return g.sijax.process_request()

        savedFiles = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if
                      os.path.isfile(os.path.join(app.config["UPLOAD_FOLDER"], f))]
        event_config = jsonProcess(config_json)

        update_temp(app, None)

        return render_template("main.html",
                               form_init_js=form_init_js,
                               json_options=get_json_options(),
                               files=savedFiles,
                               logic="",
                               file_folder=app.config["UPLOAD_FOLDER"],
                               configfile=os.path.join(app.root_path, "config.txt"),
                               config=json.dumps(event_config))  # Render template
    return app


if __name__ == "__main__":
    app = create_app()
    with open(os.path.join(app.root_path, "config.txt"), "r") as config_file:
        config_json = json.load(config_file)
    app.run(threaded=True, debug=True)  # run the flask app

