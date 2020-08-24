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


def to_float(val):
    """Parse numbers and lists of numbers as floats."""
    try:
        return float(val)
    except:
        try:
            return [float(item) for item in val]
        except:
            return val


class Event(object):

    def __init__(self, name, data, channels):
        self.name = name
        self.subevents = [[{key: to_float(value) for key, value in subevent.items()} for subevent in step] for step in data["subEvents"]]
        self.blocks = {}
        self.length = 0
        self.channels = channels
        self.event_channels = list(dict.fromkeys([subevent["name"] for step in self.subevents for subevent in step]))

    def calc_block_lengths(self):
        indices = {ch: [] for ch in self.channels}
        prev_events = {ch: dict(eventType=None) for ch in self.channels}
        step_cnt = 0
        for i, step in enumerate(self.subevents):
            for j, subevent in enumerate(step):
                channel = subevent["name"]
                # use parameters from last subevent on channel if same event type
                if subevent["eventType"] == prev_events[channel]["eventType"]:
                    self.subevents[i][j] = dict(prev_events[channel], **subevent)
                indices[channel] += [step_cnt]
                prev_events[channel] = subevent
            step_cnt += 1
        for channel in self.channels:
            if not indices[channel] or indices[channel][0] > 0:
                indices[channel] = [0] + indices[channel]
                self.subevents[0] += [dict(name=channel, eventType="none")]
        self.blocks = {ch: [j - i for i, j in zip(ch_indices, ch_indices[1:] + [step_cnt + 1])] for ch, ch_indices in indices.items()}
        self.length = step_cnt + 1

    def create_blocks(self, obj_response):
        for step in self.subevents:
            for subevent in step:
                length = self.blocks[subevent["name"]].pop(0)
                obj_response.call("create_block", [subevent, length, self.name])


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

class SijaxCometHandlers(object):

    def show_signals(self, obj_response, selected_json_id):
        filename = get_json_options()[selected_json_id]
        with open(os.path.join(app.config["UPLOAD_FOLDER"], filename), "r") as f:
            json_obj = json.load(f)
            f.seek(0, 0)
            for count, line in enumerate(f.readlines()):
                obj_response.html_append("#json-code", "%d <span style='margin-left: %dpx'>%s<br>" % (count, 40 * line.count("\t"), line.strip()))
        yield obj_response
        channels = list(dict.fromkeys([subevent["name"] for event_data in json_obj.values() for step in event_data["subEvents"] for subevent in step]))
        for channel in channels:
            obj_response.html_append("#ch-select", "<option val='" + channel + "'>" + channel + "</option>");
        for name, data in json_obj.items():
            event = Event(name, data, channels)
            event.calc_block_lengths()
            obj_response.call("add_event", [event.name, event.length])
            yield obj_response
            event.create_blocks(obj_response)
            yield obj_response


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
            g.sijax.register_comet_object(SijaxCometHandlers())
            return g.sijax.process_request()
        return render_template("main.html", form_init_js=form_init_js, json_options=get_json_options())  # Render template
    return app


if __name__ == "__main__":
    app = create_app()
    app.run(threaded=True, debug=True)  # run the flask app
