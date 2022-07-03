import json


class JsonHand:
    """basic handler to conver python list to json"""

    def __init__(self, title, info):
        self.title = title
        self.info = info
        self.converted = {}
        self.current_json = {}
        self.compared = ['']

        self._pull()
        self._convert()
        self._compare()
        self._push()

        print(self.compared)

    def _pull(self):
        
        j_file = open('worldie\data.json')
        self.current_json = json.load(j_file)
    
    def _convert(self):
        self.converted = {self.title: self.info}

    def _compare(self):
        for type, elements in self.current_json.items():
            for new_type, new_elements in self.converted.items():
                if type == new_type:
                    for item in new_elements:
                        if item not in elements:
                            self.compared = item

    def _push(self):
        for work, elements in self.current_json.items():
            if type(self.compared) == str:
                elements.append(self.compared)
            elif type(self.compared) == list:
                for item in self.compared:
                    elements.append(item)
        
        with open('worldie\data.json', 'w') as outfile:
            json.dump(self.current_json, outfile)

       
        


        

        
        
