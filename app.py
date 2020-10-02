# Import modules
from flask import Flask, render_template, g, request
import flask_sijax
import os
import json
from sijax_handlers import SijaxCometHandlers, SijaxUploadHandlers, SijaxHandlers
from functions import update_temp, get_json_options, jsonProcess

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
        VALUE_FOLDER=os.path.join(app.root_path, "valued_jsons"),
        TEMP_FOLDER= app.root_path
    )
    app.secret_key = b"\xa4\xfb3hXuN2G\xce\n\xe0\xcf,\x8d\xb6"
    flask_sijax.Sijax(app)  # initialize flask-sijax

    with open(os.path.join(app.root_path, "config.txt"), "r") as config_file:
        config_json = json.load(config_file)

    @flask_sijax.route(app, '/visualizer')
    def visualizer():
        """
        Render the visualizer template and route it to '/visualizer'.

        Returns:
            The rendered html template for the visualizer.
        """
        if g.sijax.is_sijax_request:
            g.sijax.register_comet_object(SijaxCometHandlers(app))
            return g.sijax.process_request()
        return render_template("visualizer.html")

    @flask_sijax.route(app, '/')
    def main():
        """
        Render the main template and route it to '/'.

        Returns:
            The rendered html template for the main page.
        """
        form_init_js = g.sijax.register_upload_callback("upload-json", SijaxUploadHandlers(app).upload_json)  # Register Sijax upload handlers
        if g.sijax.is_sijax_request:
            g.sijax.register_object(SijaxHandlers(app, config_json))
            return g.sijax.process_request()
        savedFiles = [f for f in os.listdir(app.config["UPLOAD_FOLDER"]) if os.path.isfile(os.path.join(app.config["UPLOAD_FOLDER"], f))]
        event_config = jsonProcess(config_json)
        update_temp(app, None)
        return render_template("main.html",
                               form_init_js=form_init_js,
                               json_options=get_json_options(app),
                               files=savedFiles,
                               logic="",
                               file_folder=app.config["UPLOAD_FOLDER"],
                               configfile=os.path.join(app.root_path, "config.txt"),
                               config=json.dumps(event_config))
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(threaded=True, debug=True)  # run the flask app

