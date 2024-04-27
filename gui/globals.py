import tkinter as tk
from datetime import date
# Initialize the root Tkinter window
root = tk.Tk()

# Initialize the global variables with a default value or None
calendar_frame = tk.Frame(root)
calendar_frame.pack(fill="both", expand=True)
month_year_label = tk.Label(calendar_frame)  
month = date.today().month
year = date.today().year
