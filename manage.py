import os
import sys

gui_path = os.path.join(os.getcwd(), 'gui')
print(gui_path)
sys.path.insert(0, gui_path)

import dotenv
dotenv.load_dotenv()
from gui import create_app

CONFIG_PATH = os.environ.get('CONFIG_PATH')
if __name__ == '__main__':
    create_app(CONFIG_PATH)