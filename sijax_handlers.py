import os
import json
import numpy as np
from werkzeug.utils import secure_filename
from translator import Parser
import copy
import time


UNITS = {
    "y": 1e-24,
    "z": 1e-21,
    "a": 1e-18,
    "f": 1e-15,
    "p": 1e-12,
    "n": 1e-9,
    "u": 1e-6,
    "m": 1e-3,
    "": 1,
    "k": 1e3,
    "M": 1e6,
    "G": 1e9,
    "T": 1e12,
    "P": 1e15,
    "E": 1e18,
    "Z": 1e21,
    "Y": 1e24
}


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
    # read data
    data = raw_data_obj["data"]
    event_table_data_all = data["eventData"]
    experiment_table_data = np.transpose(data["experimentData"])
    variable_data = data["variableData"]
    event_type_data_all = json.load(config_file)["events"]

    # experiment variables
    defaults = {}
    for channel, channel_variables in variable_data.items():
        defaults[channel] = {}
        for variable, variable_data in channel_variables.items():
            defaults[channel][variable] = variable_data

    # experiment events
    event_library = {}
    for event_table in event_table_data_all:
        event_type = event_table["eventType"]
        event_params = event_type_data_all[event_type]["params"]
        event_param_names = sorted(event_params)
        event_table_data = event_table["data"]
        for event in event_table_data:
            event_data = dict(eventType=event_type, ID=event[0])
            for idx, param_value in enumerate(event[1:]):
                param_name = event_param_names[idx]
                param_data = event_params[param_name]
                if param_value and param_data["type"] in ["float", "int"]:
                    if param_value[-1] in UNITS.keys():
                        event_data[param_name + "_units"] = param_value[-1] + param_data["unit"]
                        event_data[param_name + "_scale"] = str(UNITS[param_value[-1]])
                        event_data[param_name] = param_value[:-1]
                    else:
                        event_data[param_name + "_units"] = param_data["unit"]
                        event_data[param_name + "_scale"] = "1"
                        event_data[param_name] = param_value
                else:
                    event_data[param_name] = param_value
            event_library[event[0]] = event_data

    # experiment logic
    logic = []
    channels = experiment_table_data[0]
    channel_devices = experiment_table_data[1]
    for timestep in experiment_table_data[2:]:
        if len([event for event in timestep if event]) > 0:
            events = []
            for idx, event in enumerate(timestep):
                if event:
                    events.append(dict(alias=channels[idx], deviceType=channel_devices[idx], **event_library[event]))
            logic.append(events)

    # experiment aliases
    aliases = {"gateware": "SimpleUrukul"}
    for idx, channel in enumerate(channels):
        if len([event for event in experiment_table_data[2:, idx] if event]) > 0:
            aliases[channel] = dict(type=channel_devices[idx], board_id=idx, channel_id=idx)

    # hardcoded experiment description
    description = {
        "name": filename,
        "creator": "Seneca",
        "control": "Artiq",
        "version": "5.71"
    }

    return dict(logic=logic, defaults=defaults, description=description, aliases=aliases)

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
        script_file_path = os.path.join(self.app.config["SCRIPT_FOLDER"], experiment_name + ".py")
        parser = Parser(experiment_file_path)
        script = parser.create_experiment().translate()
        with open(script_file_path, "w") as script_file:
            current_time = time.strftime("%m/%d/%y %H:%M:%S", time.localtime())
            script = '"""Script "%s" generated by Seneca on %s"""\n\n%s' % (experiment_name + ".py", current_time, script)
            script_file.write(script)
        obj_response.call("displayScript", [script])
