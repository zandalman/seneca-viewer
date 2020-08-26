# Import modules
from flask import Flask, render_template, g, request
import flask_sijax
from werkzeug.utils import secure_filename
import os
import json
import uuid
from collections import OrderedDict

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
    return {gen_id("j", filename): filename for filename in os.listdir(app.config["UPLOAD_FOLDER"])}


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
    def __init__(self, name, data, channels):
        self.name = name
        self.subevents = [[{key: to_float(value) for key, value in subevent.items()} for subevent in step] for step in data["subEvents"]]
        self.blocks = {}
        self.length = 0
        self.channels = channels
        self.event_channels = list(dict.fromkeys([subevent["name"] for step in self.subevents for subevent in step]))

    def calc_block_lengths(self):
        """Calculate the relative length of the signal block for each subevent."""
        indices = {ch: [] for ch in self.channels}
        prev_events = {ch: dict(eventType=None) for ch in self.channels}
        step_cnt = 0
        for i, step in enumerate(self.subevents):
            for j, subevent in enumerate(step):
                channel = subevent["name"]
                # use parameters from last subevent on channel if same event type
                if subevent["eventType"] == prev_events[channel]["eventType"]:
                    self.subevents[i][j] = dict(prev_events[channel], **subevent)
                indices[channel] += [step_cnt]
                prev_events[channel] = subevent
            step_cnt += 1
        for channel in self.channels:
            if not indices[channel] or indices[channel][0] > 0:
                indices[channel] = [0] + indices[channel]
                self.subevents[0] += [dict(name=channel, eventType="none")]
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
                length = self.blocks[subevent["name"]].pop(0)
                obj_response.call("create_block", [subevent, length, self.name])


class SijaxUploadHandlers(object):
    """
    Handlers object encapsulating Sijax upload handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def upload_json(self, obj_response, files, form_values):
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

    def get_json(self, obj_response, file):
        '''
        Updates #jsonDisplay to contain the selected JSON input, if valid.

                Parameters:
                        file (string): File name
        '''
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

    def save_json(self, obj_response, logic_json, file_name):
        '''
        Saves #spreadsheet logic to a JSON file in "UPLOAD_FOLDER"

                Parameters:
                        logic_obj (application/json): #spreadsheet JSON file output
                        file_name (String): user inputted file name
        '''
        #if file_name in os.listdir(app.config["UPLOAD_FOLDER"]):
        #    obj_response.alert("json file '%s' exists. Do you wish to overwrite?" % filename)
        data = logic_json
        file_name = file_name + ".json"
        groups = data.keys()
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
        with open(os.path.join(app.config["UPLOAD_FOLDER"], file_name), 'w') as file:
            try:
                json.dump(logic, file, indent=2)
                # obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", file_name), file_name))
                # obj_response.call("refresh_json_options")
            except Exception as err:
                print(err)


class SijaxCometHandlers(object):
    """
    Handlers object encapsulating Sijax comet handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def show_signals(self, obj_response, selected_json_id):
        """
        Display signals for the selected JSON file.

        Args:
            obj_response: Sijax object response.
            selected_json_id (str): Id of the selected JSON file.

        Yields:
            Sijax object response.
        """
        filename = get_json_options()[selected_json_id]
        # Read JSON file
        with open(os.path.join(app.config["UPLOAD_FOLDER"], filename), "r") as f:
            json_obj = json.load(f)
            # Write JSON to code dialog
            f.seek(0, 0)
            for count, line in enumerate(f.readlines()):
                obj_response.html_append("#json-code", "%d <span style='margin-left: %dpx'>%s</span><br>" % (count, 40 * line.count("\t"), line.strip()))
        yield obj_response
        channels = list(dict.fromkeys([subevent["name"] for event_data in json_obj.values() for step in event_data["subEvents"] for subevent in step]))
        for channel in channels:
            obj_response.html_append("#ch-select", "<option val='" + channel + "'>" + channel + "</option>")
        for name, data in json_obj.items():
            event = Event(name, data, channels)
            event.calc_block_lengths()
            obj_response.call("add_event", [event.name, event.length])
            yield obj_response
            event.create_blocks(obj_response)
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
        JSON_FILES_PATH = os.path.join(app.root_path, "json_files")
    )
    flask_sijax.Sijax(app)  # initialize flask-sijax

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
            g.sijax.register_comet_object(SijaxCometHandlers())
            return g.sijax.process_request()

        savedFiles = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if
                      os.path.isfile(os.path.join(app.config["UPLOAD_FOLDER"], f))]

        event_config = jsonProcess(config_json)

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

