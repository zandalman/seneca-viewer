import time
import os
import json
from werkzeug.utils import secure_filename
from functions import gen_id


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
            obj_response.call("loadJson", [json.loads(file_data.read().decode("utf-8"))])
            obj_response.html("#loaded-experiment-name", filename)


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
    experiment_data = data["experimentData"]
    data_raw_converted = {"data":{"eventData": [], "experimentData": []}}
    channels = experiment_data.keys()
    exp_data_list = data_raw_converted["data"]["experimentData"]
    for channel in channels:
        ch_list = [channel]
        exp_data_list.append(ch_list)
        for event in experiment_data[channel]:
            ch_list.append(event["ID"])
    #print (data_raw_converted)
    event_data_list = data_raw_converted["data"]["eventData"]
    for event_type in event_data:
        ev_type_list = []
        event_data_list.append(ev_type_list)
        for event in event_data[event_type]:
            ev_vals = []
            ev_type_list.append(ev_vals)
            for value in event.values():
                ev_vals.append(value)
    return data_raw_converted


def raw_to_json(config_file, raw_data_obj):
    """
    Converts a JSON containing the raw table format to a JSON sequence file.

    Args:
        config_file: Configuration file.
        raw_data_obj: JSON containing raw Handsontable data. Output of json_to_raw.
    Returns:
        Human-readable sequence JSON.
    """
    data = raw_data_obj["data"]
    event_data = data["eventData"]
    experiment_data = data["experimentData"]
    data_json_converted = {"data": {}}
    # Processing the experiment section first
    experiment_json = {}
    for channel in experiment_data:
        channel_events = []
        for event in channel[1:]:
            channel_events.append({"ID": event})
        experiment_json[channel[0]] = channel_events
    data_json_converted["data"]["experimentData"] = experiment_json
    event_config = json.load(config_file)
    sorted_events = sorted(event_config)
    event_type_json = {}
    # iterate through the events, alphabetically sorted
    for event_type_list, event_type in zip(event_data, sorted_events):
        parameters = event_config[event_type]['params']
        converted_event_list = []
        for event in event_type_list:
            event_dict = {}
            event_dict["ID"] = event[0]
            # iterate through the parameters
            for value, parameter in zip(event[1:], parameters):
                event_dict[parameter] = value
            converted_event_list.append(event_dict)
        event_type_json[event_type] = converted_event_list
    data_json_converted["data"]["eventData"] = event_type_json
    return data_json_converted

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

    def save_json(self, obj_response, json_string, filename):
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
        #elif filename in os.listdir(self.app.config["UPLOAD_FOLDER"]):
        #    obj_response.alert("A json file '%s.json' already exists." % filename)
        else:
            with open(os.path.join(self.app.config["UPLOAD_FOLDER"], filename + ".txt"), 'w') as f:
                try:
                    json.dump(json_string, f, indent=2)
                    #obj_response.html("#loaded-experiment-name", filename)
                except Exception as e:
                    print(e)
            with open(os.path.join(self.app.config["UPLOAD_FOLDER"], filename + ".json"), 'w') as f:
                try:
                    config = open(self.app.config["EVENT_CONFIG"])
                    json_output = raw_to_json(config, json_string)
                    json.dump(json_output, f, indent=2)
                    json_to_raw(json_output)
                    obj_response.html("#loaded-experiment-name", filename)
                except Exception as e:
                    print(e)