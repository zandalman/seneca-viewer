from flask import Flask, render_template, g
from sijax_handlers import SijaxHandlers
import flask_sijax
import os

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
        SIJAX_JSON_URI="/static/js/sijax/json2.js"
    )
    flask_sijax.Sijax(app)  # initialize flask-sijax

    @flask_sijax.route(app, '/')
    def main():
        """
        Render the main page.

        Returns:
            The rendered html template for the main page.
        """
        #form_init_js = g.sijax.register_upload_callback("add-routine-form", SijaxUploadHandlers(app).add_routine) # Register Sijax upload handlers
        if g.sijax.is_sijax_request:
            g.sijax.register_object(SijaxHandlers(app))
            return g.sijax.process_request()
        return render_template("main.html")  # Render template
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(threaded=True, debug=True)  # run the flask app
