from flask import Flask, render_template, g
import flask_sijax
import os
from werkzeug import secure_filename
import os
import json
import uuid

json_options = {}

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
    return {gen_id("j", filename): filename for filename in os.listdir(app.config["UPLOAD_FOLDER"])}

class SijaxUploadHandlers(object):

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
            obj_response.html_append("#json", "<option value='%s'>%s</option>" % (gen_id("j", filename), filename))
            obj_response.call("refresh_json_options")

class SijaxHandlers(object):

    def remove_json(self, obj_response, selected_json_id):
        filename = get_json_options()[selected_json_id]
        os.remove(os.path.join(app.config["UPLOAD_FOLDER"], filename))

    def show_signals(self, obj_response, selected_json_id):
        pass

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
        UPLOAD_FOLDER=os.path.join(app.root_path, "uploads")
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
            g.sijax.register_object(SijaxHandlers())
            return g.sijax.process_request()
        return render_template("main.html", form_init_js=form_init_js, json_options=get_json_options())  # Render template
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(threaded=True, debug=True)  # run the flask app
