import os
import json
import numpy as np
from werkzeug.utils import secure_filename
from translator import Parser


class SijaxUploadHandlers(object):
    """
    Handlers object encapsulating Sijax upload handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

    def load_json(self, obj_response, files, form_values):
        """
        Load a JSON experiment file.

        Args:
            obj_response: Sijax object response.
            files: A list containing the Werkzeug FileStorage object for the uploaded file.
            form_values: Dictionary of form values. Unused here.
        """
        if "file" not in files:
            obj_response.alert("Load unsuccessful.")
            return
        file_data = files["file"]
        filename = file_data.filename
        if not filename:
            obj_response.alert("Load cancelled.")
        elif file_data.content_type != "application/json":
            obj_response.alert("'%s' is not a json file." % filename)
        elif filename != secure_filename(filename):
            obj_response.alert("File name '%s' is not secure." % filename)
        else:
            experiment_name = os.path.splitext(filename)[0]
            experiment_data = json.loads(file_data.read().decode("utf-8"))
            obj_response.call("loadJson", [experiment_name, experiment_data])


class SijaxCometHandlers(object):
    """
    Handlers object encapsulating Sijax comet handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

def json_to_raw(json_obj):
    """
    Converts a JSON sequence file to a JSON containing the raw table data format.

    Args:
        json_obj: JSON sequence file. Output of raw_to_json.

    Returns:
        JSON containing data in the Handsontable format.
    """
    data = json_obj["data"]
    event_data = data["eventData"]
    experiment_data = data["logic"]
    channels = experiment_data.keys()
    exp_data_list = []
    for channel in channels:
        ch_list = [channel]
        exp_data_list.append(ch_list)
        for event in experiment_data[channel]:
            ch_list.append(event["ID"])
    #print (data_raw_converted)
    data["logic"] = exp_data_list
    event_data_list = []
    for event_type in event_data:
        ev_type_dict = {"data": []}
        event_data_list.append(ev_type_dict)
        for event in event_data[event_type]["data"]:
            ev_vals = []
            ev_type_dict["data"].append(ev_vals)
            for value in event.values():
                ev_vals.append(value)
    data["eventData"] = event_data_list
    return {"data": data}


def raw_to_json(config_file, raw_data_obj, filename):
    """
    Converts a JSON containing the raw table format to a JSON sequence file.

    Args:
        config_file: Configuration file.
        raw_data_obj: JSON containing raw Handsontable data. Output of json_to_raw.
    Returns:
        Human-readable sequence JSON.
    """
    data = raw_data_obj["data"]
    event_data = data.pop("eventData")
    experiment_data = data["logic"]
    exp_data_tp = np.transpose(experiment_data)
    event_config = json.load(config_file)
    sorted_events = sorted(event_config["events"])
    eventLibrary = {}
    # iterate through the events, alphabetically sorted
    for event_type_list, event_type in zip(event_data, sorted_events):
        parameters = event_config["events"][event_type]["params"]
        for event in event_type_list["data"]:
            event_ID = event[0]
            event_dict = {"eventType": event_type}
            # iterate through the parameters
            for value, parameter in zip(event[1:], parameters):
                event_dict[parameter] = value
            eventLibrary[event_ID] = event_dict

    # Processing the experiment section
    logic = exp_data_tp.astype("object")
    aliases = {"gateware": "SimpleUrukul"}
    for idx, (channel, device) in enumerate(zip(logic[0], logic[1])):
        aliases[channel] = dict(type=device, board_id=idx, channel_id=idx)
    for time_block in logic[2:]:
        for idx, event in enumerate(time_block):
            if event:
                time_block[idx] = eventLibrary[event]
                time_block[idx]["ID"] = event
                time_block[idx]["alias"] = logic[0][idx]
    logic = logic[2:].tolist()
    for (index, time_block) in enumerate(logic):
        time_block = [event for event in time_block if event]
        logic[index] = time_block
    data["logic"] = logic

    # hardcoded experiment description
    description = {
        "name": filename,
        "creator": "Seneca",
        "control": "Artiq",
        "version": "5.71"
    }

    return dict(**data, description=description, aliases=aliases)

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

    def save_json(self, obj_response, json_string, filename, override):
        """
        Save an experiment as a JSON experiment file.

        Args:
            obj_response: Sijax object response.
            json_string: JSON string to be saved.
            filename: File name.
        """
        if not filename:
            obj_response.alert("No file name entered.")
        elif filename != secure_filename(filename):
            obj_response.alert("File name '%s' is not secure." % filename)
        elif not override and filename + ".json" in os.listdir(self.app.config["UPLOAD_FOLDER"]):
            obj_response.call("confirmOverrideExperiment", [json_string, filename])
        else:
            with open(os.path.join(self.app.config["UPLOAD_FOLDER"], filename + ".json"), 'w') as f:
                config = open(self.app.config["EVENT_CONFIG"])
                json_output = raw_to_json(config, json_string, filename)
                json.dump(json_output, f, indent=2)
            obj_response.call("afterSuccessfulSave")

    def translate_experiment(self, obj_response, experiment_name):
        experiment_file_path = os.path.join(self.app.config["UPLOAD_FOLDER"], experiment_name + ".json")
        script_file_path = os.path.join(self.app.config["SCRIPT_FOLDER"], experiment_name + ".json")
        parser = Parser(experiment_file_path)
        script = parser.create_experiment().translate()
        with open(script_file_path, "w") as script_file:
            script_file.write(script)
