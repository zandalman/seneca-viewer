from script_templates import artiq_templates
import json 
import random


class Experiment():
    def __init__(self, experiment_name, control_software, aliases):
        self.name = experiment_name
        self.control = control_software
        self.aliases = aliases
        
        self.sequence = []
        self.events = {}
        self.devices = {}
        self.translation = ""
        
        startup = globals()[self.control + "Startup"]
        self.startup = startup(self.devices, self.aliases)
    
    def add(self, event):
        self.check_device(event)
        self.sequence.append(event.id)
        self.events[event.id] = event
        
    def add_before(self, event, ref_id):
        id_index = self.sequence.index(ref_id) - 1
        self.insert(id_index, event)
        
    def add_after(self, event, ref_id):
        id_index = self.sequence.index(ref_id) + 1
        self.insert(id_index, event)
    
    def check_device(self, event):
        if event.device_name not in self.devices:
            self.devices[event.device_name] = [event.id]
        else:
            self.devices[event.device_name].append(event.id)
             
    def remove_device(self, device_name):
        for event_id in self.devices[device_name]:
            self.remove_event(event_id)
            
        del self.devices[device_name]
    
    # returns event object based on string   
    @staticmethod
    def build(event_string, device_name, aliases, **kwargs):            
        event_object = globals()[event_string]
        kwargs.pop("eventType")
        kwargs.pop("ID")
        kwargs.pop("alias")
        return event_object(device_name, aliases, **kwargs)
    
    def insert(self, index, event):
        self.check_device(event)
        if isinstance(event, object):
            self.sequence.insert(index, event)
            self.event[event.id] = event
        elif isinstance(event, list):
            for entry in reversed(event):
                self.sequence.insert(index, entry)
                self.events[entry.id] = entry
    
    def remove_event(self, event_id):
        self.sequence.remove(event_id)
        del self.events[event_id]
    
    def delete(self, index):
        event_id = self.sequence[index]
        del self.events[event_id]
        del self.sequence[index]
        
    def translate(self):  
        translation = [str(self.startup)]
        for event_id in self.sequence:
            translation.append(str(self.events[event_id]))
        return '\n'.join(translation)


class Device():
    def __init__(self, device_name, device_type):
        self.name = device_name
        self.type = device_type
        self.events = []


class Event():
    def __init__(self, device_name, device_type, event_id):
        self.device_name = device_name
        self.device_type = device_type
        self.id = event_id


class DDSEvent(Event):
    def __init__(self, device_name, device_type, event_id):
        super().__init__(device_name, device_type, event_id)


class ArtiqEvent(Event):
    def __init__(self, device_name, event_type, event_id, aliases, **kwargs):
        super().__init__(device_name, aliases[device_name]["type"], event_id)
        self.board = aliases[device_name]["board_id"]
        self.channel = aliases[device_name]["channel_id"]
        self.base_translation = ArtiqEventBlock(event_id)
        
        if isinstance(artiq_templates[self.device_type][event_type], list):
            lines = artiq_templates[self.device_type][event_type]
        else:
            event_dictionary = artiq_templates[self.device_type][event_type]
            self.base_translation.add_control(event_dictionary["control"].format(**kwargs))
            lines = artiq_templates[self.device_type][event_type]["block"
            ]
        
        for line in lines:
            print("1")
            self.base_translation.add(line.format(board_id = self.board, 
                                                  channel_id = self.channel,
                                                  **kwargs))
            
        self.translation = self.base_translation
        self.base_output = str(self.base_translation)
        self.base_output = str(self.base_translation)
        self.output = self.base_output
        
    def __repr__(self):
        self.output = str(self.translation)
        return str(self.translation) 


class Startup():
    def __init__(self, devices, aliases):
        self.devices = devices
        self.aliases = aliases


class ArtiqStartup(Startup):
    def __init__(self, devices, aliases):
        super().__init__(devices, aliases)
        self.imports = ArtiqImports()
        self.env = ArtiqEnv(aliases["gateware"])
        self.build = ArtiqBuild(aliases)
        self.kernel = ArtiqKernel(aliases)
        self.translation = [self.imports, self.env, self.build, self.kernel]
        
    def __repr__(self):
        self.generate_output()
        return self.output
    
    def generate_output(self):
        output = []
        for translation in self.translation:
            output.append(str(translation))
        self.output = '\n'.join(output)
        return self.output
    
    def update_devices(self):
        pass


class DAC(Event):
    def __init__(self, name, function_type):
        super().__init__(name)


class ArtiqDAC(DAC):
    def __init__(self, name):
        super().__init__(name)   
        self.build = []
        
    def __repr__(self):
        pass
        
    def translate(self): 
        pass


class TTL(Event):
    def __init__(self, name, pulse_width, duty_cycle, number = 1):
        super().__init__(name)


class ArtiqTTL(Event):
    def __init__(self, name):
        super().__init__(name)
        

class ArtiqException(Exception):
    pass


class Block:
    def __init__(self, name, control = "", decorator = "", indents = 0):
        self.id = name
        self.indents = indents
        self.disable = False
        
        self.lines = []
        self.control = control
        self.decorator = decorator
        
        self.lines_indented = []
        self.control_indented = ""
        self.decorator_indented = ""
        
        self.__output = ""
    
    def __repr__(self):
        self.generate_output()
        return self.__output
    
    def __add__(self, line) -> object:
        self.add(line)
        self.update_indent()
        return self
    
    def __radd__(self, line) -> object:
        self.insert(0, line)
        self.update_indent()
        return self
    
    def update_indent(self):
        # clear previous
        self.lines_indented = []
        
        compound_indent = ""
        control_indent = ""
        
        for i in range (0, self.indents):
            compound_indent += "    "  
            control_indent += "    " 
            
        if self.control:
            compound_indent += "    "         
        
        for line in self.lines:
            self.lines_indented.append(compound_indent + line) 
            if self.control:
                self.control_indented = control_indent + self.control 
                if self.decorator: 
                    self.decorator_indented = control_indent + self.decorator

    def generate_output(self, end_in_newline = True) -> str:
        """Formats lines with indents and combines as single string output"""
        compound_statement = self.lines_indented
        if self.control: 
            compound_statement = [self.control_indented] + compound_statement
        self.__output = '\n'.join(compound_statement)
        if end_in_newline is True:
            self.__output += '\n'
        return self.__output   
    
    def add_control(self, control_statement):
        self.control = control_statement
        self.update_indent()
        
    def add_decorator(self, decorator):
        self.decorator = decorator
        self.update_indent()
    
    def set_indent(self, indent_number):
        self.indents = indent_number
        self.update_indent()
    
    def add(self, line):
        if isinstance(line, str):
            self.lines.append(line)
        elif isinstance(line, list):
            self.lines += line

        self.update_indent()
                
    def insert(self, index, line):
        if isinstance(line, str):
            self.lines.insert(index, line)
        elif isinstance(line, list):
            for entry in reversed(line):
                self.lines.insert(index, entry)
   
        self.update_indent()


class ArtiqImports(Block):
    def __init__(self):
        super().__init__("header", indents = 0)
        self.imports = ["from artiq.experiment import *"]
        for imported in self.imports:
            self.add(imported)
    
    def add_import(self, library):
        self.add(library)


class ArtiqEnv(Block):
    def __init__(self, gateware_name):
        super().__init__("env", indents = 0)
        self.gateware_name =  gateware_name
        self.add("class {}(EnvExperiment):".format(gateware_name))


class ArtiqBuild(Block):
    def __init__(self, aliases):
        contr = "def build(self):"
        super().__init__("build", control = contr, indents = 1)
        self.add("self.setattr_device('core')")
        
        for alias in aliases:
            if isinstance(aliases[alias], dict):
                parameters = aliases[alias]
                device = parameters["type"]
                line = artiq_templates[device]["build"].format(**parameters)
                self.add(line)
        
class ArtiqKernel(Block):
    def __init__(self, aliases):
        contr = "def run(self):"
        dec = "@kernel"
        super().__init__("build", control = contr, decorator = dec, indents = 1)
        self.add("self.core.reset() # resets core device")
        
        for alias in aliases:
            if isinstance(aliases[alias], dict):
                parameters = aliases[alias]
                device = parameters["type"]
                lines = artiq_templates[device]["initialize"]
                for line in lines:
                    self.add(line.format(**parameters))


class ArtiqEventBlock(Block):
    def __init__(self, event_id, parallel = False):
        if parallel is False:
            super().__init__(event_id, indents = 2)        
        else:
            contr = "in parallel:"
            super().__init__("build", control = contr, indents = 2)
            
        
class ArtiqRPC(Block):
    def __init__(self):
        contr = "def run(self):"
        dec = "@kernel"
        super().__init__("build", control = contr, decorator = dec, indents = 1)


class Translator():
    def __init__(self, aliases):
        self.aliases = aliases


class ArtiqTranslator(Translator):
    def __init__(self, aliases):
        super().__init__(aliases)


class Parser():
    def __init__(self, json_path):
        with open(json_path, 'r') as json_file:
            self.experiment = json.load(json_file)
        self.logic = self.experiment["logic"]
        self.assign_id()
        self.defaults = self.experiment["defaults"]
        self.aliases = self.experiment["aliases"]
        self.control = self.experiment["description"]["control"]
        self.version = self.experiment["description"]["version"]
        self.title = self.experiment["description"]["name"]
    
    def assign_id(self):
        """ Assigns each event with a unique random ID. 
            This is excluded from the JSON to reduce verbosity. """
        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"
        ids = []
        for event in self.logic:

            if isinstance(event, dict):
                while True:
                    rand_id = "".join(random.choice(chars) for _ in range(5))
                    if rand_id not in ids:
                        ids.append(rand_id)
                        event["ID"] = rand_id
                        break
            
        
    def create_experiment(self):
        this_experiment = Experiment(self.title, 
                                     self.control, 
                                     self.aliases)
        
        for event in self.logic:
            generic = ["eventType", "deviceType", "alias", "ID"]
            event_args = {}

            for argument in event:
                if argument not in generic:
                    event_args[argument] = event[argument]
            
            event_name = self.control + "Event"
            EventObject = globals()[event_name]
            new_event = EventObject(
                                event["alias"],
                                event["eventType"],
                                event["ID"],
                                self.aliases,  
                                **event_args)
            this_experiment.add(new_event)
        
        return this_experiment
