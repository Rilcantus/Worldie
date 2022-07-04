import json


class JsonHand:
    """basic handler to conver python list to json"""

    def __init__(self, title, info):
        self.title = title
        self.info = info
        self.outfile = r"worldie\data.json"
        self.work_types = {}
        self.current_json = {}

        self._pull()
    
    def _pull(self):
        # pull data from .json file
        self.current_json = json.load("worldie\data.json")
        print(self.current_json)

    def _covert(self):
        # converts in coming title and info to json ready
        pass

    def _compare(self):
        # check stored list to the incoming list and add only new info(keys)
        pass

    def _push(self):
        # add new keys from compared to stored list then push back
        pass

       
        


        

        
        
