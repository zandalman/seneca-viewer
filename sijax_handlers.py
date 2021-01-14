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
        #elif filename in os.listdir(self.app.config["UPLOAD_FOLDER"]):
            #obj_response.alert("A json file '%s' has already been uploaded." % filename)
        else:
            obj_response.call("loadJson", [json.load(file_data)])
            #file_data.save(os.path.join(self.app.config["UPLOAD_FOLDER"], filename))
            #obj_response.html_append("#json-select", "<option value='%s'>%s</option>" % (gen_id("j", filename), filename))
            #obj_response.call("refresh_json_options")



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

    def save_json(self, obj_response, json_file, file_name):
        """
        Saves a JSON file.

        Args:
            obj_response: Sijax object response.
            json_file: JSON string to be saved.
            file_name: File name.
        """
        with open(os.path.join(self.app.config["UPLOAD_FOLDER"], file_name + ".json"), 'w') as file:
            try:
                json.dump(json_file, file, indent=2)
            except Exception as e:
                print(e)