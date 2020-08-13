import numpy as np
import matplotlib.pyplot as plt

class SijaxHandlers(object):
    """
    Handlers object encapsulating Sijax Handlers.

    Encapsulation allows all handlers to be registered simultaneously.
    """
    def __init__(self, app):
        self.app = app

    def create_block(self, obj_response, type):
        x = np.linspace(0, 2 * np.pi, 200)
        if type == "sine":
            plt.plot(x, np.sin(x))
        #obj_response.html_append("#block-container", "<img class='block' url=>")