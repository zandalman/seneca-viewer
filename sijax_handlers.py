import time
import os
import json
from werkzeug.utils import secure_filename
from sequence_parser import Parser
from functions import gen_id, get_json_options, update_temp, update_code_dialog


class SijaxUploadHandlers(object):
    """
    Handlers object encapsulating Sijax upload handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

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
        elif filename in os.listdir(self.app.config["UPLOAD_FOLDER"]):
            obj_response.alert("A json file '%s' has already been uploaded." % filename)
        else:
            file_data.save(os.path.join(self.app.config["UPLOAD_FOLDER"], filename))
            obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", filename), filename))
            obj_response.call("refresh_json_options")


class SijaxCometHandlers(object):
    """
    Handlers object encapsulating Sijax comet handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

    def update(self, obj_response):
        """
        Periodically check for changes in the modification time of 'temp.json'
            and update visualization window on change.

        Args:
            obj_response: Sijax object response.
        """
        mtime = time.time()
        while True:
            filepath = os.path.join(self.app.root_path, "temp.json")
            if os.path.getmtime(filepath) != mtime:
                mtime = os.path.getmtime(filepath)
                if os.path.getsize(filepath) == 0:
                    obj_response.call("reset")
                    yield obj_response
                else:
                    obj_response.call("reset")
                    with open(filepath, "r") as f:
                        data = json.load(f)
                    parser = Parser(obj_response, data)
                    obj_response.call("enable_filters")
                    parser.html()
                    yield obj_response


class SijaxHandlers(object):
    """
    Handlers object encapsulating Sijax handlers.

    Encapsulation allows all handlers to be registered simultaneously.

    Args:
        app: Sijax app.

    Attributes:
        app: Sijax app.
    """
    def __init__(self, app, config_json):
        self.app = app
        self.config_json = config_json

    def remove_json(self, obj_response, selected_json_id):
        """
        Remove the selected JSON file.

        Args:
            obj_response: Sijax object response.
            selected_json_id (str): Id of the selected JSON file.
        """
        filename = get_json_options(self.app)[selected_json_id]
        os.remove(os.path.join(self.app.config["UPLOAD_FOLDER"], filename))
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
            filename = get_json_options(self.app)[selected_json_id]
            if filename:
                with open(os.path.join(self.app.config["UPLOAD_FOLDER"], filename), "r") as json_file:
                    json_string = json.dumps(json.load(json_file))
                    if page_name == "spreadsheet":
                        obj_response.call('uploadJson', [json_string])
                    if page_name == "parameter":
                        obj_response.call('uploadJsonTemplate', [json_string])

    def update_temp(self, obj_response, selected_json_id):
        """
        Update the temporary JSON file.

        Args:
            obj_response: Sijax object response.
            selected_json_id (str): Id of the selected JSON file.
        """
        filename = get_json_options(self.app)[selected_json_id]
        update_temp(self.app, filename)
        if filename:
            update_code_dialog(obj_response, self.app)

    def save_json(self, obj_response, logic_json, file_name, temp):
        """
        Saves #spreadsheet logic to a JSON file in "UPLOAD_FOLDER"

                Parameters:
                        logic_obj (application/json): #spreadsheet JSON file output
                        file_name (String): file_name
                        temp (bool): true if saving to temp.json
        """
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
                    subColumns = self.config_json[subEventType].keys()
                    frmtSubEvent = {}
                    # the first two columns do not contain data
                    for key in subColumns:
                        columnIndex = columns.index(key)
                        frmtSubEvent[key] = subEvent[columnIndex]
                    eventList.append(frmtSubEvent)
                logic[group]["subEvents"].append(eventList)
        logic_json["content"] = logic
        if temp:
            file_folder = self.app.config["TEMP_FOLDER"]
        if not temp:
            file_folder = self.app.config["UPLOAD_FOLDER"]
        json_list = os.listdir(self.app.config["UPLOAD_FOLDER"])
        with open(os.path.join(file_folder, file_name), 'w') as file:
            try:
                json.dump(logic_json, file, indent=2)
                if temp:
                    update_code_dialog(obj_response, self.app)
                else:
                    if file_name not in json_list:
                        obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", file_name), file_name))
                        obj_response.call("refresh_json_options")
            except Exception as err:
                print(err)

    def save_parameter_json(self, obj_response, logic_json, file_name, temp):
        '''
        Saves #parameter logic to a JSON file in "VALUE_FOLDER"

                Parameters:
                        logic_obj (application/json): #parameter JSON file output
                        file_name (String): file_name
                        temp (bool): true if saving to temp.json
        '''
        if temp:
            file_folder = self.app.config["TEMP_FOLDER"]
        if not temp:
            file_folder = self.app.config["VALUE_FOLDER"]
        json_list = os.listdir(self.app.config["VALUE_FOLDER"])
        with open(os.path.join(file_folder, file_name), 'w') as file:
            try:
                json.dump(logic_json, file, indent=2)
                if temp:
                    update_code_dialog(obj_response, self.app)
                else:
                    if file_name not in json_list:
                        obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", file_name), file_name))
                        obj_response.call("refresh_json_options")
            except Exception as err:
                print(err)