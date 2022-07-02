import re



class ExportData:
    """class to handle information for the export function"""

    def __init__(self, data):
        self.data = data
        self.keys = []
        self.markers = ['-', ':']

        self._find_keys()


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
                    list_ele = element.split(marker)
                    self.keys.append(list_ele[0])
                

        print(self.keys)            
        print(items)

       
                



        
        

