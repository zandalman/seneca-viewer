from flask import Flask, render_template, g, jsonify, request
import pathlib, os, json, datetime
from datetime import datetime
import flask_sijax

app = Flask(__name__)

sijax_path = os.path.join('.', os.path.dirname(__file__), 'static/js/sijax/')
app.config['SIJAX_STATIC_PATH'] = sijax_path
app.config['SIJAX_JSON_URI'] = '/static/js/sijax/json2.js'
flask_sijax.Sijax(app)

@app.route('/')
def hello_world():
    return 'Hello World!'

class SijaxHandlers(object):
    def get_json(obj_response, file):
        '''
        Updates #jsonDisplay to contain the selected JSON input, if valid.

                Parameters:
                        file (string): File name
        '''
        with open(os.path.join(json_files_path, file), "r") as json_file:
            try:
                textCallback = json.dumps(json.load(json_file), indent=2)
                obj_response.script('$("#jsonDisplay").attr("validity","True")')
            except ValueError as err:
                textCallback = "file is invalid JSON"
                obj_response.script('$("#jsonDisplay").attr("validity","False")')
            json_file.close()
        obj_response.html("#jsonDisplay", textCallback)
        json_file.close()

instance_path = os.path.dirname(pathlib.Path(app.instance_path))
json_files_path = os.path.join(instance_path, "json_files")

@app.route("/spreadsheet", methods=("GET", "POST"))
def spreadsheet():
    if g.sijax.is_sijax_request:
        g.sijax.register_callback("get_json", SijaxHandlers.get_json)
        return g.sijax.process_request()

    savedFiles = [f for f in os.listdir(json_files_path) if os.path.isfile(os.path.join(json_files_path, f))]

    with open(os.path.join(instance_path, "config.txt"), "r") as config_file:
        config_json = json.load(config_file)
    event_config = {
        "types": list(config_json.keys()),
        "example_data": list(config_json.values())
    }
    event_config["type_parameters"] = {}
    for type in config_json:
        event_config["type_parameters"][type] = list(config_json[type].keys())
    event_config["all_parameters"] = []
    for event in event_config["type_parameters"]:
        for parameter in event_config["type_parameters"][event]:
            event_config["all_parameters"].append(parameter)
    event_config["all_parameters"] = list(set(event_config["all_parameters"]))
    # Column generation requires that eventType be the first parameter
    event_config["all_parameters"].remove("eventType")
    event_config["all_parameters"].insert(0, "eventType")

    if request.method == 'POST':
        data = request.get_json()["fileData"]
        file_name = request.get_json()["fileName"] + ".txt"
        events = data.keys()
        columns = json.loads(data[list(events)[0]]["data"])["header"]
        logic = {}
        for event in events:
            subEventsObj = json.loads(data[event]["data"])["body"]
            eventData = {}
            eventData["seqType"] = data[event]["sequenceType"]
            frmtData = []
            for subEvent in subEventsObj:
                subEventType = subEvent[2]
                subColumns = config_json[subEventType].keys()
                frmtSubEvent = {}
                # the first two columns do not contain data
                for key in subColumns:
                    columnIndex = columns.index(key)
                    frmtSubEvent[key] = subEvent[columnIndex]
                frmtData.append(frmtSubEvent)
            eventData["subEvents"] = frmtData
            logic[event] = eventData
        with open(os.path.join(logic_path, file_name), 'w') as file:
            json.dump(logic, file, indent=2)
    return render_template("spreadsheet.html",
                           files=savedFiles,
                           file_folder = json_files_path,
                           configfile=os.path.join(instance_path, "config.txt"),
                           config=json.dumps(event_config))


@app.route('/timeline', methods=['GET', 'POST'])
def timeline():
    savedFiles = [f for f in os.listdir(json_files_path) if os.path.isfile(os.path.join(logic_path, f))]

    if g.sijax.is_sijax_request:
        g.sijax.register_callback('get_json', get_json)
        return g.sijax.process_request()

    return render_template('timeline.html', json_options=savedFiles, file_folder=json_files_path)


if __name__ == '__main__':
    app.run()
