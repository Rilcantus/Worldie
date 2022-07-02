import json


class JsonHand:
    """basic handler to conver python list to json"""

    def __init__(self, title, info):
        self.title = title
        self.info = info

        self._convert()


    def _convert(self):
        data = {self.title : self.info}

        dumped = json.dumps(data)
        
        
        
