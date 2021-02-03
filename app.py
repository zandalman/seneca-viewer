# Import modules
from flask import Flask, render_template, g, request
import flask_sijax
import os
import json
from sijax_handlers import SijaxCometHandlers, SijaxUploadHandlers, SijaxHandlers

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
        TEMP_FOLDER= app.root_path,
        EVENT_CONFIG=os.path.join(app.root_path, "static/events.json")
    )
    app.secret_key = b"\xa4\xfb3hXuN2G\xce\n\xe0\xcf,\x8d\xb6"
    flask_sijax.Sijax(app)  # initialize flask-sijax

    event_type_data_path = os.path.join(app.root_path, "static", "events.json")
    with open(event_type_data_path, "r") as f:
        event_type_data = json.load(f)

    @flask_sijax.route(app, '/')
    def main():
        """
        Render the main template and route it to '/'.

        Returns:
            The rendered html template for the main page.
        """
        form_init_js = g.sijax.register_upload_callback("upload-json", SijaxUploadHandlers(app).load_json)  # Register Sijax upload handlers
        if g.sijax.is_sijax_request:
            g.sijax.register_object(SijaxHandlers(app))
            return g.sijax.process_request()
        return render_template("main.html",
                               form_init_js=form_init_js,
                               event_type_data=event_type_data)
    return app



if __name__ == "__main__":
    app = create_app()
    app.run(threaded=True, debug=True)  # run the flask app

