from datetime import date, datetime, timezone, time, timedelta
import time as time_module
import pytz
from globals import root
import tkinter as tk

from tkinter import filedialog, \
                    Text, \
                    Toplevel, Radiobutton, \
                    StringVar, messagebox, \
                    Entry, Button
from tktimepicker import SpinTimePickerOld, constants
from tkcalendar import Calendar as tkcalendar
            
import sqlite3
import yaml
                    
print("Current Timezone: ", time_module.tzname)

def add_photo():
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # check if there is a default path for photos
    if not config.get('DefaultSettings').get('photo_path'):
        photo_path = "/"
    else:
        photo_path = config.get('DefaultSettings').get('photo_path')
    # Open file dialog restricted to image files
    file_path = filedialog.askopenfilenames(initialdir=photo_path, title="Select File",
                                           filetypes=(("jpeg files", "*.jpg"), ("png files", "*.png"), ("all files", "*.*")))
    print("Photo selected:", file_path)
    if file_path is None or file_path == "":
        return
    add_photo_popup = Toplevel(root)
    add_photo_popup.title("Add a Photo")
    
    schedule_option = StringVar(value="None")
    

    Radiobutton(add_photo_popup, text="Next available day (no photo scheduled)", variable=schedule_option, value="1A").pack(anchor='w')
    schedule_option.set("1A")
    Radiobutton(add_photo_popup, text="Next available day (no content scheduled)", variable=schedule_option, value="1B").pack(anchor='w')
    Radiobutton(add_photo_popup, text="Pick a specific day", variable=schedule_option, value="2").pack(anchor='w')

    
    specific_time_entry = Entry(add_photo_popup)
    specific_time_entry.pack(pady=5)
    specific_time_entry.pack_forget()
    
    def submit_photo():
        if schedule_option.get() == "None":
            messagebox.showerror("Error", "Please select a scheduling option.")
            return
        
        print("Photo selected:", file_path)
        print("Scheduling option:", schedule_option.get())
        
        conn = sqlite3.connect('database_jay.sqlite3')
        cur = conn.cursor()
        my_tz = pytz.timezone('US/Pacific')

        print("Scheduling option:", schedule_option.get())
        if schedule_option.get() == "1A":
            print("Next available day (no photo scheduled)")
            # Code to insert the post content into the SQLite database goes here
            last_post_date = cur.execute("SELECT post_date FROM content WHERE content_type = 'post' ORDER BY post_date DESC LIMIT 1").fetchone()
            
        if schedule_option.get() == "1B":
            print("Next available day (no content scheduled)")
            # Code to insert the post content into the SQLite database goes here
        if schedule_option.get() == "2":
            specific_day = specific_time_entry.get()
            print("Specific day:", specific_day)
            # Validation for specific day input can be added here

        # Code to insert the post content into the SQLite database goes here

        add_photo_popup.destroy()

    submit_button = Button(add_photo_popup, text="Submit Post", command=submit_photo)
    submit_button.pack(pady=5)
    
    add_photo_popup.grab_set()
    add_photo_popup.wait_window(add_photo_popup)
    # Here you can add the code to insert the photo path into your SQLite database

def add_video():
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    # check if there is a default path for videos
    if not config.get('DefaultSettings').get('video_path'):
        video_path = "/"
    else:
        video_path = config.get('DefaultSettings').get('video_path')
    # Open file dialog restricted to video files
    file_path = filedialog.askopenfilenames(initialdir=video_path, title="Select File",
                                           filetypes=(("mp4 files", "*.mp4"), ("avi files", "*.avi"), ("all files", "*.*")))
    print("Video selected:", file_path)
    # Here you can add the code to insert the video path into your SQLite database

    print("Photo selected:", file_path)
    if file_path is None or file_path == "":
        return
    add_photo_popup = Toplevel(root)
    add_photo_popup.title("Add a Photo")
    
    schedule_option = StringVar(value="None")
    

    Radiobutton(add_photo_popup, text="Next available day (no photo scheduled)", variable=schedule_option, value="1A").pack(anchor='w')
    schedule_option.set("1A")
    Radiobutton(add_photo_popup, text="Next available day (no content scheduled)", variable=schedule_option, value="1B").pack(anchor='w')
    Radiobutton(add_photo_popup, text="Pick a specific day", variable=schedule_option, value="2").pack(anchor='w')
    add_photo_popup.grab_set()
    add_photo_popup.wait_window(add_photo_popup)
    
def add_post(root):
    post_popup = Toplevel(root)
    post_popup.title("Add a Post")

    # Container for the content input and scheduling options
    content_frame = tk.Frame(post_popup)
    content_frame.pack(padx=10, pady=10, fill='x')

    post_input = Text(content_frame, width=40, height=10)
    post_input.pack()

    schedule_option = StringVar(value="1A")

    Radiobutton(content_frame, text="Next available day (no post scheduled)", variable=schedule_option, value="1A").pack(anchor='w')
    Radiobutton(content_frame, text="Next available day (no content scheduled)", variable=schedule_option, value="1B").pack(anchor='w')
    Radiobutton(content_frame, text="Pick a specific day", variable=schedule_option, value="2").pack(anchor='w')

    # Container for the calendar and time picker
    schedule_frame = tk.Frame(post_popup)
    # schedule_frame.pack(fill='both', expand=True)

    # Initialize the calendar and time picker inside the schedule_frame
    today = date.today()
    date_cal = tkcalendar(schedule_frame, selectmode='day', year=today.year, month=today.month, day=today.day)
    date_cal.pack_forget()  # Initially hide the calendar

    specific_time_picker = SpinTimePickerOld(post_popup, orient=constants.HORIZONTAL)
    specific_time_picker.addAll(constants.HOURS12)  # For a 24-hour clock, or use constants.HOURS12 for a 12-hour clock
    specific_time_picker.pack()  # Initially hide the time picker

    def on_option_change():
        if schedule_option.get() == "2":
            schedule_frame.pack(fill='both', expand=True)
            date_cal.pack(pady=5)
            
        else:
            date_cal.pack_forget()
            
            schedule_frame.pack_forget()

    for widget in content_frame.pack_slaves():
        if isinstance(widget, Radiobutton):
            widget.config(command=on_option_change)



    def submit_post():
        if schedule_option.get() == "None":
            messagebox.showerror("Error", "Please select a scheduling option.")
            return

        post_content = post_input.get("1.0", "end-1c")
        print("Post content:", post_content)
        print("Scheduling option:", schedule_option.get())

        conn = sqlite3.connect('database_jay.sqlite3')
        cur = conn.cursor()
        my_tz = pytz.timezone('US/Pacific')
        if schedule_option.get() == "1A":
            last_post_date = cur.execute("SELECT post_date FROM content WHERE content_type = 'post' ORDER BY post_date DESC LIMIT 1").fetchone()
            print("Last post date:", last_post_date)
            last_post_date_str = datetime.fromtimestamp(last_post_date[0]).strftime("%m/%d/%y")
            print("Last post date (formatted):", last_post_date_str)
            
            # Get the next day
            next_day = datetime.strptime(last_post_date_str, "%m/%d/%y") + timedelta(days=1)
            print("Next day:", next_day)
            
            
            time_tuple = specific_time_picker.time()  # e.g., (1, 0, 'a.m')
            
            # Convert the time tuple to a datetime.time object
            hour = time_tuple[0] % 12 + (12 if time_tuple[2] == 'p.m' else 0)
            minute = time_tuple[1]
            selected_time = time(hour, minute)
            
            # Combine the date and time
            complete_datetime = datetime.combine(next_day, selected_time)
            complete_datetime = my_tz.localize(complete_datetime)
            print("Complete Time:", complete_datetime)
            
            
            cur.execute("INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)", (1,"post", post_content, complete_datetime.timestamp(), 0))
            conn.commit()
        if schedule_option.get() == "1B":
            cur.execute("SELECT post_date FROM content ORDER BY post_date DESC LIMIT 1")
            last_post_date = cur.fetchone()
            print("Last post date:", last_post_date)
            last_post_date_str = datetime.fromtimestamp(last_post_date[0], timezone.utc).strftime("%m/%d/%y")
            print("Last post date (formatted):", last_post_date_str)
            
            # Get the next day
            next_day = datetime.strptime(last_post_date_str, "%m/%d/%y") + timedelta(days=1)
            print("Next day:", next_day)
            
            # Get the time from the time picker
            time_tuple = specific_time_picker.time()  # e.g., (1, 0, 'a.m')
            
            # Convert the time tuple to a datetime.time object
            hour = time_tuple[0] % 12 + (12 if time_tuple[2] == 'p.m' else 0)
            minute = time_tuple[1]
            selected_time = time(hour, minute)
            
            # Combine the date and time
            complete_datetime = datetime.combine(next_day, selected_time)
            complete_datetime = my_tz.localize(complete_datetime)
            print("Complete Time:", complete_datetime)
            
            cur.execute("INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)", (1,"post", post_content, complete_datetime.timestamp(), 0))
            conn.commit()
            
        if schedule_option.get() == "2":
            specific_day = date_cal.get_date()

            specific_day_obj = datetime.strptime(specific_day, "%m/%d/%y")

            # Get the time from the time picker
            time_tuple = specific_time_picker.time()  # e.g., (1, 0, 'a.m')

            # Convert the time tuple to a datetime.time object
            hour = time_tuple[0] % 12 + (12 if time_tuple[2] == 'p.m' else 0)
            minute = time_tuple[1]
            selected_time = time(hour, minute)

            # Combine the date and time
            complete_datetime = datetime.combine(specific_day_obj, selected_time)
            complete_datetime = my_tz.localize(complete_datetime)
            print("Complete Time:", complete_datetime)

            # Convert the datetime object to a Unix timestamp
            unix_timestamp = complete_datetime.timestamp()

            print("Unix Timestamp:", unix_timestamp)
            
            cur.execute("INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)", (1,"post", post_content, unix_timestamp, 0))
            conn.commit()

        post_popup.destroy()

    # Pack the submit button at the bottom of the post_popup
    submit_button = Button(post_popup, text="Submit Post", command=submit_post)
    submit_button.pack(side="bottom", pady=5)
    
    post_popup.grab_set()
    post_popup.wait_window(post_popup)