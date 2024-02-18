import tkinter as tk
from tkinter import filedialog, Text, Menu, Toplevel, Radiobutton, StringVar, messagebox, Entry, Button, messagebox
import os
import webbrowser
from datetime import date
import calendar

def open_accounts():
    # Function to handle opening the accounts management section
    pass

def open_support():
    webbrowser.open('https://github.com/Masterjx9/socialmediascheduler/issues')

def add_photo():
    # Open file dialog restricted to image files
    file_path = filedialog.askopenfilename(initialdir="/", title="Select File",
                                           filetypes=(("jpeg files", "*.jpg"), ("png files", "*.png"), ("all files", "*.*")))
    print("Photo selected:", file_path)
    # Here you can add the code to insert the photo path into your SQLite database

def add_video():
    # Open file dialog restricted to video files
    file_path = filedialog.askopenfilename(initialdir="/", title="Select File",
                                           filetypes=(("mp4 files", "*.mp4"), ("avi files", "*.avi"), ("all files", "*.*")))
    print("Video selected:", file_path)
    # Here you can add the code to insert the video path into your SQLite database

def add_post():
    post_popup = Toplevel(root)
    post_popup.title("Add a Post")

    post_input = Text(post_popup, width=40, height=10)
    post_input.pack(padx=10, pady=10)

    # Variables for radio button selection
    schedule_option = StringVar(value="None")

    # Radio buttons for scheduling options
    Radiobutton(post_popup, text="Next available day (no post scheduled)", variable=schedule_option, value="1A").pack(anchor='w')
    schedule_option.set("1A")  # Set the default value
    
    Radiobutton(post_popup, text="Next available day (no content scheduled)", variable=schedule_option, value="1B").pack(anchor='w')
    Radiobutton(post_popup, text="Pick a specific day", variable=schedule_option, value="2").pack(anchor='w')

    # Entry field for picking a specific day (visible when Option 2 is selected)
    specific_day_entry = Entry(post_popup)
    specific_day_entry.pack(pady=5)
    specific_day_entry.pack_forget()  # Hide initially

    def on_option_change():
        # Show the entry field when Option 2 is selected, hide it otherwise
        if schedule_option.get() == "2":
            specific_day_entry.pack(pady=5)
        else:
            specific_day_entry.pack_forget()

    # Attach the option change command to radio buttons
    for widget in post_popup.pack_slaves():
        if isinstance(widget, Radiobutton):
            widget.config(command=on_option_change)

    def submit_post():
        if schedule_option.get() == "None":
            messagebox.showerror("Error", "Please select a scheduling option.")
            return

        post_content = post_input.get("1.0", "end-1c")
        print("Post content:", post_content)
        print("Scheduling option:", schedule_option.get())

        if schedule_option.get() == "2":
            specific_day = specific_day_entry.get()
            print("Specific day:", specific_day)
            # Validation for specific day input can be added here

        # Code to insert the post content into the SQLite database goes here

        post_popup.destroy()

    submit_button = Button(post_popup, text="Submit Post", command=submit_post)
    submit_button.pack(pady=5)

    post_popup.grab_set()
    post_popup.wait_window(post_popup)


# Calendar-specific functions and variables
month_year_label = None 
month = date.today().month
year = date.today().year
textObjectDict = {}
saveDict = {}

def print_month_year(month, year):
    written_month = date(year, month, 1).strftime('%B')
    month_year_label = tk.Label(calendar_frame, text=f"{written_month} {year}", font=("Arial", 20))
    month_year_label.grid(column=2, row=0, columnspan=3)

def switch_months(direction):
    global month, year
    if direction == 1 and month == 12:
        month = 1
        year += 1
    elif direction == -1 and month == 1:
        month = 12
        year -= 1
    else:
        month += direction
    rebuild_calendar()

def rebuild_calendar():
    global calendar_frame
    for widget in calendar_frame.winfo_children():
        widget.destroy()
    print_month_year(month, year)
    make_buttons()
    month_generator()

def make_buttons():
    go_back = tk.Button(calendar_frame, text="<", command=lambda: switch_months(-1))
    go_back.grid(column=0, row=0)
    go_forward = tk.Button(calendar_frame, text=">", command=lambda: switch_months(1))
    go_forward.grid(column=6, row=0)

def month_generator():
    # # Remove previous labels and frames
    # for widget in calendar_frame.winfo_children():
    #     if isinstance(widget, tk.Label) or isinstance(widget, tk.Frame):
    #         widget.destroy()
    
    # Calendar header for days of the week
    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for i, name in enumerate(day_names):
        tk.Label(calendar_frame, text=name).grid(row=1, column=i)

    # Find out the first day of the month and the number of days in the month
    first_weekday, num_days = calendar.monthrange(year, month)

    # Variables to keep track of the current day and when to start counting
    day_counter = 0
    start_counting = False

    for row in range(2, 8):  # Allow for up to 6 weeks
        for col in range(7):  # 7 days in a week
            if start_counting or (row == 2 and col == first_weekday):
                start_counting = True
                if day_counter <= num_days:
                    print(f"Row: {row}, Col: {col}, Day: {day_counter}")
                    # if day_counter != 0:
                    day_frame = tk.Frame(calendar_frame, height=50, width=50, bd=1, relief="ridge")
                    day_frame.grid(row=row, column=col, sticky="nsew", padx=1, pady=1)
                    if day_counter != 0:
                        tk.Label(day_frame, text=str(day_counter)).pack()
                    else:
                        tk.Label(day_frame, text="").pack()
                    day_counter += 1
                    calendar_frame.grid_columnconfigure(col, weight=1)
        calendar_frame.grid_rowconfigure(row, weight=1)
                    


root = tk.Tk()
root.title("Content Scheduler")
root.geometry("500x400")  # Set the width to 500 and height to 400

menu_bar = Menu(root)
root.config(menu=menu_bar)

accounts_menu = Menu(menu_bar, tearoff=0)
menu_bar.add_cascade(label="Accounts", menu=accounts_menu)
accounts_menu.add_command(label="Manage Accounts", command=open_accounts)

content_menu = Menu(menu_bar, tearoff=0)
menu_bar.add_cascade(label="Content", menu=content_menu)
content_menu.add_command(label="Add Photo", command=add_photo)
content_menu.add_command(label="Add Video", command=add_video)
content_menu.add_command(label="Add Post", command=add_post)

settings_menu = Menu(menu_bar, tearoff=0)
menu_bar.add_cascade(label="Settings", menu=settings_menu)
settings_menu.add_command(label="Manage Settings")

help_menu = Menu(menu_bar, tearoff=0)
menu_bar.add_cascade(label="Help", menu=help_menu)
help_menu.add_command(label="Support", command=open_support)
help_menu.add_command(label="About")

month = date.today().month
year = date.today().year

calendar_frame = tk.Frame(root)
calendar_frame.pack(fill="both", expand=True)
print_month_year(month, year)
make_buttons()
month_generator()


root.mainloop()
