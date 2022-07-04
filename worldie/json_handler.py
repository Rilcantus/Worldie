import json


class JsonHand:
    """basic handler to conver python list to json"""

    def __init__(self, title, info):
        self.title = title
        self.info = info
        self.outfile = "worldie\data.json"
        self.work_types = {}
        self.current_json = {}
        self.converted = {}
        self.compared = {}

        self._pull()
        self._covert()
        self._compare()
        self._push()
    
    def _pull(self):
        # pull data from .json file
        try:
            self.current_json = json.load(self.outfile)
            print(self.current_json.items())
        
        except:
            print("no data")

    def _covert(self):
        # converts in coming title and info to json ready
        self.converted = {self.title: self.info}
        print(self.converted)

    def _compare(self):
        # check stored list to the incoming list and add only new info(keys)
        if self.title in self.current_json:
            print("yes")
        elif self.title not in self.current_json:
            print("no {}".format(self.title))
            self.compared = self.converted 
            print(self.compared)

    def _push(self):
        # add new keys from compared to stored list then push back
        self.current_json[self.title = ]
        with open (self.outfile, 'w') as outfile:
            json.dump(self.current_json, outfile, indent=4)

        

       
        


        

        
        
