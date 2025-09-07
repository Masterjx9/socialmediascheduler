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
import os

with open(os.environ.get('CONFIG_PATH'), 'r') as f:
    config = yaml.safe_load(f)
    my_tz = pytz.timezone(config['DefaultSettings']['timezone'])
    conn = sqlite3.connect(config['DefaultSettings']['database_path'])
    cur = conn.cursor()
    
print("Current Timezone: ", time_module.tzname)

def add_photo(mode="menu", content_id=None):
    if mode == "menu":
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
    
    if mode == "calendar":
        print("Content ID:", content_id)
        
        cur.execute("SELECT content_data FROM content WHERE content_id = ?", (content_id,))
        photo_path = cur.fetchone()
        print("Photo Path:", photo_path)
        
        cur.execute("SELECT post_date FROM content WHERE content_id = ?", (content_id,))
        post_date = cur.fetchone()
        print("Post Date:", post_date)
        
        schedule_option = setup_schedule_options(add_photo_popup, "photo", "2")
        date_cal, specific_time_picker, schedule_frame = build_calendar_time(add_photo_popup, post_date[0])
        
        schedule_frame.pack(fill='both', expand=True)
        date_cal.pack(pady=5)
    else:
        schedule_option = setup_schedule_options(add_photo_popup, "photo", "1A")
        date_cal, specific_time_picker, schedule_frame = build_calendar_time(add_photo_popup)
    
    on_option_change = configure_option_change_behavior(schedule_option, date_cal, schedule_frame)
    attach_option_change_command(add_photo_popup, on_option_change)
            
    def submit_photo():
        if schedule_option.get() == "None":
            messagebox.showerror("Error", "Please select a scheduling option.")
            return
        
        print("Photo selected:", file_path)
        print("Scheduling option:", schedule_option.get())
        
        if schedule_option.get() == "2":
            submit_content("image", file_path[0], schedule_option, specific_time_picker, "calendar", content_id, date_cal)
        else:
            submit_content("image", file_path[0], schedule_option, specific_time_picker)

        add_photo_popup.destroy()

    submit_button = Button(add_photo_popup, text="Submit Post", command=submit_photo)
    submit_button.pack(side="bottom", pady=5)
    
    add_photo_popup.grab_set()
    add_photo_popup.wait_window(add_photo_popup)

def add_video(mode="menu", content_id=None):
    if mode == "menu":
        # check if there is a default path for videos
        if not config.get('DefaultSettings').get('video_path'):
            video_path = "/"
        else:
            video_path = config.get('DefaultSettings').get('video_path')
        # Open file dialog restricted to video files
        file_path = filedialog.askopenfilenames(initialdir=video_path, title="Select File",
                                            filetypes=(("mp4 files", "*.mp4"), ("avi files", "*.avi"), ("all files", "*.*")))
        print("Video selected:", file_path)
        if file_path is None or file_path == "":
            return
        
    add_video_popup = Toplevel(root)
    add_video_popup.title("Add a Video")
    
    if mode == "calendar":
        print("Content ID:", content_id)
        
        cur.execute("SELECT content_data FROM content WHERE content_id = ?", (content_id,))
        video_path = cur.fetchone()
        print("Video Path:", video_path)
        
        cur.execute("SELECT post_date FROM content WHERE content_id = ?", (content_id,))
        post_date = cur.fetchone()
        print("Post Date:", post_date)
        
        schedule_option = setup_schedule_options(add_video_popup, "video", "2")
        date_cal, specific_time_picker, schedule_frame = build_calendar_time(add_video_popup, post_date[0])        
        
        schedule_frame.pack(fill='both', expand=True)
        date_cal.pack(pady=5)
    else:
        schedule_option = setup_schedule_options(add_video_popup, "video", "1A")
        date_cal, specific_time_picker, schedule_frame = build_calendar_time(add_video_popup)
    
    on_option_change = configure_option_change_behavior(schedule_option, date_cal, schedule_frame)
    attach_option_change_command(add_video_popup, on_option_change)
    
    def submit_video():
        if schedule_option.get() == "None":
            messagebox.showerror("Error", "Please select a scheduling option.")
            return
        
        print("Video selected:", file_path)
        print("Scheduling option:", schedule_option.get())
        
        if schedule_option.get() == "2":
            submit_content("video", file_path[0], schedule_option, specific_time_picker, date_cal)
        else:
            submit_content("video", file_path[0], schedule_option, specific_time_picker)

        add_video_popup.destroy()
    
    submit_button = Button(add_video_popup, text="Submit Post", command=submit_video)
    submit_button.pack(side="bottom", pady=5)
    
    add_video_popup.grab_set()
    add_video_popup.wait_window(add_video_popup)
    
def add_post(mode="menu", content_id=None):
    post_popup = Toplevel(root)
    post_popup.title("Add a Post")

    # Container for the content input and scheduling options
    content_frame = tk.Frame(post_popup)
    content_frame.pack(padx=10, pady=10, fill='x')

    post_input = Text(content_frame, width=40, height=10)
    post_input.pack()    
    
    if mode == "calendar":
        print("Content ID:", content_id)
        
        cur.execute("SELECT content_data FROM content WHERE content_id = ?", (content_id,))
        post_content = cur.fetchone()
        print("Post Content:", post_content)
        post_input.insert("1.0", post_content[0])
        
        cur.execute("SELECT post_date FROM content WHERE content_id = ?", (content_id,))
        post_date = cur.fetchone()
        print("Post Date:", post_date)
        
        schedule_option = setup_schedule_options(content_frame, "post", "2")
        date_cal, specific_time_picker, schedule_frame = build_calendar_time(content_frame, post_date[0])
        
        schedule_frame.pack(fill='both', expand=True)
        date_cal.pack(pady=5)
    else:
        schedule_option = setup_schedule_options(content_frame, "post", "1A")
        date_cal, specific_time_picker, schedule_frame = build_calendar_time(content_frame)

    
    on_option_change = configure_option_change_behavior(schedule_option, date_cal, schedule_frame)
    attach_option_change_command(content_frame, on_option_change)


    def submit_post():
        if schedule_option.get() == "None":
            messagebox.showerror("Error", "Please select a scheduling option.")
            return

        post_content = post_input.get("1.0", "end-1c")
        print("Post content:", post_content)
        print("Scheduling option:", schedule_option.get())

        if schedule_option.get() == "2":
            submit_content("post", post_content, schedule_option, specific_time_picker, "calendar", content_id, date_cal)
        else:
            submit_content("post", post_content, schedule_option, specific_time_picker)

        post_popup.destroy()

    # Pack the submit button at the bottom of the post_popup
    submit_button = Button(post_popup, text="Submit Post", command=submit_post)
    submit_button.pack(side="bottom", pady=5)
    
    post_popup.grab_set()
    post_popup.wait_window(post_popup)
    
def delete_content(content_id):
    # Get the post date of the content to be deleted
    cur.execute("SELECT published FROM content WHERE content_id = ?", (content_id,))
    published = cur.fetchone()[0]
    
    if published == 1:
        print("Cannot delete content that has already passed.")
        messagebox.showerror("Error", "Cannot delete content that has already passed.")
        return
    
    # Create a confirmation popup
    confirmation = messagebox.askyesno("Confirmation", "Are you sure you want to delete this content?")
    
    if confirmation:
        # Delete the content from the database
        cur.execute("DELETE FROM content WHERE content_id = ?", (content_id,))
        conn.commit()
        print("Content deleted successfully.")
    else:
        print("Deletion cancelled.")
        
# Helper functions for the add_photo, add_video, and add_post functions
def configure_option_change_behavior(schedule_option, date_cal, schedule_frame):
    def on_option_change():
        if schedule_option.get() == "2":
            schedule_frame.pack(fill='both', expand=True)
            date_cal.pack(pady=5)
        else:
            date_cal.pack_forget()
            schedule_frame.pack_forget()
    return on_option_change

def attach_option_change_command(container, command):
    for widget in container.pack_slaves():
        if isinstance(widget, Radiobutton):
            widget.config(command=command)

def setup_schedule_options(container, content_type, default_value="1A"):
    schedule_option = StringVar(value=default_value)
    options = [
        (f"Next available day (no {content_type} scheduled)", "1A"),
        ("Next available day (no content scheduled)", "1B"),
        ("Pick a specific day", "2")
    ]
    for text, value in options:
        Radiobutton(container, text=text, variable=schedule_option, value=value).pack(anchor='w')
    return schedule_option

def build_calendar_time(container, post_date=None):
    schedule_frame = tk.Frame(container)

    # Initialize the calendar and time picker inside the schedule_frame
    today = date.today()
    date_cal = tkcalendar(schedule_frame, selectmode='day', year=today.year, month=today.month, day=today.day)
    
    specific_time_picker = SpinTimePickerOld(container, orient=constants.HORIZONTAL)
    specific_time_picker.addAll(constants.HOURS12)  # For a 24-hour clock, or use constants.HOURS12 for a 12-hour clock
        
    if post_date:
        print("Post Date:", post_date)
        post_date_obj = datetime.fromtimestamp(post_date, tz=my_tz)
        date_cal.selection_set(post_date_obj.date())
        print("Post Date Object:", post_date_obj)
        
        if specific_time_picker.hour_type == constants.HOURS12:
            hour = post_date_obj.hour % 12 or 12
            period = "p.m" if post_date_obj.hour >= 12 else "a.m"
        else:
            hour = post_date_obj.hour
            period = ""
        
        # Set the time
        specific_time_picker._12HrsTime.delete(0, 'end')
        specific_time_picker._12HrsTime.insert(0, str(hour))
        specific_time_picker._minutes.delete(0, 'end')
        specific_time_picker._minutes.insert(0, str(post_date_obj.minute))
        specific_time_picker._period.set(period)
        
    
    date_cal.pack_forget()  # Initially hide the calendar
    specific_time_picker.pack()  # Initially hide the time picker
    return date_cal, specific_time_picker, schedule_frame
    
# Function to submit the content to the database
def submit_content(content_type, content_data, schedule_option, specific_time_picker, mode="menu", content_id=None, date_cal=None):
    if schedule_option.get() == "1A":
        last_post_date = cur.execute(f"SELECT post_date FROM content WHERE content_type = '{content_type}' ORDER BY post_date DESC LIMIT 1").fetchone()
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
        if mode == "menu":
            cur.execute("INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)", (config["current_user"], content_type, content_data, complete_datetime.timestamp(), 0))
        if mode == "calendar":
            cur.execute("UPDATE content SET post_date = ? WHERE content_id = ?", (complete_datetime.timestamp(), content_id))
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
        time_tuple = specific_time_picker.time()
        
        # Convert the time tuple to a datetime.time object
        hour = time_tuple[0] % 12 + (12 if time_tuple[2] == 'p.m' else 0)
        minute = time_tuple[1]
        selected_time = time(hour, minute)
        
        # Combine the date and time
        complete_datetime = datetime.combine(next_day, selected_time)
        complete_datetime = my_tz.localize(complete_datetime)
        print("Complete Time:", complete_datetime)
        
        if mode == "menu":
            cur.execute("INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)", (config["current_user"], content_type, content_data, complete_datetime.timestamp(), 0))
        if mode == "calendar":
            cur.execute("UPDATE content SET post_date = ? WHERE content_id = ?", (complete_datetime.timestamp(), content_id))
        conn.commit()
    if schedule_option.get() == "2":
        specific_day = date_cal.get_date()

        specific_day_obj = datetime.strptime(specific_day, "%m/%d/%y")

        # Get the time from the time picker
        time_tuple = specific_time_picker.time()

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
        
        if mode == "menu":
            cur.execute("INSERT INTO content (user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?)", (config["current_user"], content_type, content_data, unix_timestamp, 0))
        if mode == "calendar":
            cur.execute("UPDATE content SET post_date = ? WHERE content_id = ?", (unix_timestamp, content_id))
        conn.commit()        