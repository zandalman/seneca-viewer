import uuid
import os
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


def get_json_options(app):
    """
    Get the uploaded JSON file options.

    Returns:
        Dictionary with ids as keys and filenames as values for each file in the upload folder.
    """
    json_options = {gen_id("j", filename): filename for filename in os.listdir(app.config["UPLOAD_FOLDER"])}
    json_options["none"] = None
    return json_options


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
