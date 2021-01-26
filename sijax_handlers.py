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
            with open(os.path.join(self.app.config["UPLOAD_FOLDER"], filename), 'w') as f:
                try:
                    json.dump(json_string, f, indent=2)
                    obj_response.html("#loaded-experiment-name", filename)
                except Exception as e:
                    print(e)