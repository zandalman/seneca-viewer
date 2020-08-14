from flask import Flask, render_template, g, jsonify
import pathlib, os, json
import flask_sijax

app = Flask(__name__)

sijax_path = os.path.join('.', os.path.dirname(__file__), 'static/js/sijax/')
app.config['SIJAX_STATIC_PATH'] = sijax_path
app.config['SIJAX_JSON_URI'] = '/static/js/sijax/json2.js'
flask_sijax.Sijax(app)


@app.route('/')
def hello_world():
    return 'Hello World!'


@app.route('/timeline', methods = ['GET', 'POST'])
def timeline():
    instance_path = os.path.dirname(pathlib.Path(app.instance_path))
    logic_path = os.path.join(instance_path, "logic_files")
    files = [f for f in os.listdir(logic_path) if os.path.isfile(os.path.join(logic_path, f))]

    def get_json(obj_response, file):
        with open(os.path.join(logic_path, file),"r") as json_file:
            try:
                textCallback = json.dumps(json.load(json_file), indent=2)
                obj_response.script('$("#jsonDisplay").attr("validity","True")')
            except ValueError as err:
                textCallback = "file is invalid JSON"
                obj_response.script('$("#jsonDisplay").attr("validity","False")')
            json_file.close()
        obj_response.html("#jsonDisplay", textCallback)

        json_file.close()

    g.sijax.register_callback('get_json', get_json)

    if g.sijax.is_sijax_request:
        return g.sijax.process_request()

    return render_template('timeline.html', json_options=files, file_folder=logic_path)


if __name__ == '__main__':
    app.run()
