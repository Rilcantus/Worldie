from json_handler import JsonHand

class ExportData:
    """class to handle information for the export function"""

    def __init__(self, data):
        self.data = data
        self.keys = []
        self.markers = ['-', ':']

        self._find_keys()
        self._load_json()

    def _load_json(self):
        name = input('Name of work-> ')
        JsonHand(name, self.keys[:])
        

    def _find_keys(self):
        items = self.data.split('\n')
        for line in items:
            if line == '':
                items.remove(line)

        for element in items:
            for marker in self.markers:
                if element == self.keys:
                    continue
                if marker in element:
                    list_ele = element.split(marker, 1)
                    if list_ele[0] != '\t':
                        self.keys.append(list_ele[0])
                    else:
                        continue
                

        print(self.keys)            
        print(items)

       
                



        
        

