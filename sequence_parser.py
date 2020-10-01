import uuid
from collections import OrderedDict

prefixes = {
    "Y": 1e24,
    "Z": 1e21,
    "E": 1e18,
    "P": 1e15,
    "T": 1e12,
    "G": 1e9,
    "M": 1e6,
    "k": 1e3,
    "m": 1e-3,
    "u": 1e-6,
    "n": 1e-9,
    "p": 1e-12,
    "f": 1e-15,
    "a": 1e-18,
    "z": 1e-21,
    "y": 1e-24
}


def get_value(num, unit):
    prefix = list(filter(unit.startswith, prefixes.keys()))
    return (prefixes[prefix[0]] if prefix else 1) * num


def gen_id(marker, seed):
    return marker + uuid.uuid5(uuid.NAMESPACE_DNS, seed).hex


class Channel(object):
    def __init__(self, name, events, parser):
        self.name = name
        self.ch_id = gen_id("c", name)
        self.label_id = gen_id("l", name)
        self.events = events
        self.parser = parser
        self.propagate_params()
        if not self.parser.stage0:
            self.insert_defaults()
        self.insert_lengths()

    def insert_defaults(self):
        defaults = self.parser.defaults
        for stp_idx, step in enumerate(self.events):
            for ev_idx, event in enumerate(step):
                for key, value in event.items():
                    if type(value) == str and value in defaults.keys():
                        self.events[stp_idx][ev_idx][key] = get_value(*defaults[value])

    def propagate_params(self):
        first_event = True
        for stp_idx, step in enumerate(self.events):
            if step:
                if first_event:
                    prev_event = step[0]
                    first_event = False
                else:
                    if step[0]["eventType"] == prev_event["eventType"]:
                        self.events[stp_idx] = [dict(prev_event, **step[0])]
                        prev_event = step[0]

    def insert_lengths(self):
        if not self.events[0]:
            first_group = [step[0]["group"] for step in self.events if step][0]
            self.events[0] = [dict(eventType="constant", value=0, group=first_group)]
        for stp_idx, step in enumerate(self.events):
            if step:
                if True in list(map(bool, self.events[(stp_idx + 1):])):
                    length = list(map(bool, self.events[(stp_idx + 1):])).index(True)
                else:
                    length = len(self.events[(stp_idx + 1):])
                self.events[stp_idx][0]["len"] = length + 1

    def html(self):
        self.parser.obj_response.html_append("#ch-filter",
                                      "<option value='%s'>%s</option>" % (self.ch_id, self.name))
        self.parser.obj_response.html_append("#channel-container",
                                      "<div class='channel' id='%s' data-lid='%s'></div>" % (self.ch_id, self.label_id))
        self.parser.obj_response.html_append("#channel-label-container",
                                      "<div class='channel-label' id='%s' data-chid='%s'>%s</div>" % (self.label_id, self.ch_id, self.name))
        self.parser.obj_response.html_append("#%s" % self.label_id,
                                             "<i class ='material-icons down-arrow'>arrow_downward</i><i class ='material-icons up-arrow'>arrow_upward</i>")
        if self.name in self.parser.aliases.keys():
            self.parser.obj_response.call("insert_channel_info", [self.label_id, self.parser.aliases[self.name], self.name])
        else:
            self.parser.obj_response.call("insert_channel_info", [self.label_id, {}, self.name])
        for ev_idx, event in enumerate([step[0] for step in self.events if step]):
            event_id = "%s-block%s" % (self.ch_id, ev_idx)
            self.parser.obj_response.html_append("#%s" % self.ch_id,
                                                 "<div class='block' id='%s'><canvas></canvas></div>" % event_id)
            self.parser.obj_response.call("create_block", [event, self.ch_id, self.label_id, event_id])


class Parser(object):
    def __init__(self, obj_response, data):
        self.obj_response = obj_response
        self.check_stage(data)
        self.description = data["description"]
        self.logic = data["logic"]
        self.defaults = data["defaults"] if not self.stage0 else {}
        self.params = data["exp_param"] if self.stage2 else []
        self.aliases = data["aliases"] if "aliases" in data.keys() else {}
        self.has_groups = bool(self.logic) and type(self.logic[0]) == dict
        self.groups = OrderedDict({})
        if self.has_groups:
            self.sort_groups()
        self.init_channels()

    def check_stage(self, data):
        self.stage0 = "defaults" not in data.keys()
        self.stage1 = "defaults" in data.keys() and "exp_param" not in data.keys()
        self.stage2 = "exp_param" in data.keys()

    def sort_groups(self):
        logic = []
        for group in self.logic:
            group_name = group["group"]
            self.groups[group_name] = len(group["events"])
            for step in group["events"]:
                logic.append([dict(event, **{"group": group_name}) for event in step])
        self.logic = logic

    def init_channels(self):
        aliases = {event["alias"] for step in self.logic for event in step}
        self.channels = []
        for alias in aliases:
            channel_events = [[event for event in step if event["alias"] == alias] for step in self.logic]
            self.channels.append(Channel(alias, channel_events, self))

    def html(self):
        self.obj_response.call("set_color", [self.stage0, self.stage1, self.stage2])
        for channel in self.channels:
            channel.html()
        for group_name, group_length in self.groups.items():
            self.obj_response.html_append("#grp-filter",
                                          "<option value='%s'>%s</option>" % (group_name, group_name))
            self.obj_response.html_append("#group-label-container",
                                          "<div class='group-label' style='width: %spx;' data-group='%s'>%s</div>" % (group_length * 100, group_name, group_name))
