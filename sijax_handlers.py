import time
import os
import json
from sequence_parser import Parser

class SijaxCometHandlers(object):
    """
    Handlers object encapsulating Sijax comet handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

    def update(self, obj_response):
        """
        Periodically check for changes in the modification time of 'temp.json'
            and update visualization window on change.

        Args:
            obj_response: Sijax object response.
        """
        mtime = time.time()
        while True:
            filepath = os.path.join(self.app.root_path, "temp.json")
            if os.path.getmtime(filepath) != mtime:
                mtime = os.path.getmtime(filepath)
                if os.path.getsize(filepath) == 0:
                    obj_response.call("reset")
                    yield obj_response
                else:
                    obj_response.call("reset")
                    with open(filepath, "r") as f:
                        data = json.load(f)
                    parser = Parser(obj_response, data)
                    obj_response.call("enable_filters")
                    parser.html()
                    yield obj_response
