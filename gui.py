import tkinter as tk
from tkinter import filedialog, \
                    Text, Menu, \
                    Toplevel, Radiobutton, \
                    StringVar, messagebox, \
                    Entry, Button, Label
import webbrowser
from tkcalendar import Calendar as tkcalendar
from tktimepicker import SpinTimePickerOld, AnalogPicker, AnalogThemes, constants
from datetime import date, datetime, timezone
import calendar
import sqlite3
import yaml

# First thing to do is to create a root window, then hide it until the user selects a user or a user is already selected
root = tk.Tk()
root.withdraw()

# Load the content scheduler window
def initialize_main_window():
    global calendar_frame, month_year_label, month, year
    root.title("Content Scheduler")
    root.geometry("500x400")  # Set the width to 500 and height to 400

    menu_bar = Menu(root)
    root.config(menu=menu_bar)

    accounts_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Accounts", menu=accounts_menu)
    accounts_menu.add_command(label="Manage Accounts", command=lambda: open_accounts(root))

    content_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Content", menu=content_menu)
    content_menu.add_command(label="Add Photo", command=add_photo)
    content_menu.add_command(label="Add Video", command=add_video)
    content_menu.add_command(label="Add Post", command=lambda: add_post(root))

    settings_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Settings", menu=settings_menu)
    settings_menu.add_command(label="Manage Settings", command= open_settings)

    help_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Help", menu=help_menu)
    help_menu.add_command(label="Help/Support", command=open_support)
    help_menu.add_command(label="About")

    month = date.today().month
    year = date.today().year

    calendar_frame = tk.Frame(root)
    calendar_frame.pack(fill="both", expand=True)
    print_month_year(month, year)
    make_buttons()
    month_generator()
    root.mainloop()

# Function to select a user
def select_user():
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)


    # If no current user, prompt for selection or creation
    if not config.get('current_user'):
        user_selection_popup = Toplevel(root)
        user_selection_popup.title("User Selection")
        user_selection_popup.geometry("300x200")  # Adjust size as needed

        with open('config.yaml', 'r') as f:
            config = yaml.safe_load(f)
        
        conn = sqlite3.connect(config['DefaultSettings']['database_path'])
        cur = conn.cursor()
        cur.execute("SELECT id, name FROM users")
        users = cur.fetchall()
        conn.close()

        selected_user = StringVar()

        for user in users:
            Radiobutton(user_selection_popup, text=user[1], variable=selected_user, value=user[0]).pack(anchor='w')

        new_user_name = StringVar()
        new_user_entry = Entry(user_selection_popup, textvariable=new_user_name)
        new_user_entry.pack()

        def create_new_user():
            name = new_user_name.get()
            if name:
                conn = sqlite3.connect('database_jay.sqlite3')
                cur = conn.cursor()
                cur.execute("INSERT INTO users (name) VALUES (?)", (name,))
                conn.commit()
                user_id = cur.lastrowid
                conn.close()
                config['current_user'] = user_id
                with open('config.yaml', 'w') as f:
                    yaml.safe_dump(config, f)
                user_selection_popup.destroy()
                root.deiconify()  # Show the root window
                initialize_main_window(root)
            else:
                messagebox.showerror("Error", "Please enter a name for the new user.")

        def select_user():
            if selected_user.get():
                config['current_user'] = selected_user.get()
                with open('config.yaml', 'w') as f:
                    yaml.safe_dump(config, f)
                user_selection_popup.destroy()
                root.deiconify()  # Show the root window
                initialize_main_window()
            else:
                messagebox.showerror("Error", "Please select a user.")

        Button(user_selection_popup, text="Create New User", command=create_new_user).pack()
        Button(user_selection_popup, text="Select User", command=select_user).pack()

        user_selection_popup.grab_set()
        user_selection_popup.wait_window()
        root.deiconify()  
        initialize_main_window()
    else:
        root.deiconify()  # Show the root window if a user is already selected
        initialize_main_window()

# Function to open the Manage Accounts popup
def open_accounts(root):
    # Load current user from config.yaml
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    print(config)
    current_user_id = config.get('current_user')
    print(current_user_id)

    # If no current user, prompt for selection or creation
    if not current_user_id:
        # Code to prompt for user selection or creation goes here
        pass

    # Continue with opening the Manage Accounts popup
    post_popup = Toplevel(root)
    post_popup.title("Manage Accounts")
    
    # Fetch users from the database
    conn = sqlite3.connect('database_jay.sqlite3')
    cur = conn.cursor()
    cur.execute("SELECT * FROM users")
    users = cur.fetchall()
    conn.close()
    print(users)
    
    # Create a variable to store the selected user, default to current user
    selected_user = StringVar(value=current_user_id)
    
    # Display the list of users using radiobuttons
    for user in users:
        Radiobutton(post_popup, text=user[1], variable=selected_user, value=user[0]).pack(anchor='w')
    
    def submit_user():
        if not selected_user.get():
            messagebox.showerror("Error", "Please select a user.")
            return
        
        # Update the current user in the config.yaml file
        config['current_user'] = selected_user.get()
        with open('config.yaml', 'w') as f:
            yaml.safe_dump(config, f)
        
        print("Selected user:", selected_user.get())
        post_popup.destroy()
    
    submit_button = Button(post_popup, text="Submit User", command=submit_user)
    submit_button.pack(pady=5)
    
    post_popup.grab_set()
    post_popup.wait_window(post_popup)

def open_support():
    webbrowser.open('https://github.com/Masterjx9/socialmediascheduler/issues')

def open_settings():
    settings_popup = Toplevel(root)
    settings_popup.title("Manage Settings")

    # Load current settings
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)

    # Create entry widgets for each setting
    database_label = Label(settings_popup, text="Database Path:")
    database_label.pack()
    database_entry = Entry(settings_popup)
    database_entry.pack()
    database_entry.insert(0, config['DefaultSettings']['database_path'])  # Prefill with current setting

    mode_label = Label(settings_popup, text="Mode:")
    mode_label.pack()
    mode_entry = Entry(settings_popup)
    mode_entry.pack()
    mode_entry.insert(0, config['DefaultSettings']['mode'])  # Prefill with current setting

    photo_label = Label(settings_popup, text="Photo Path:")
    photo_label.pack()
    photo_entry = Entry(settings_popup)
    photo_entry.pack()
    photo_entry.insert(0, config['DefaultSettings']['photo_path'])  # Prefill with current setting

    video_label = Label(settings_popup, text="Video Path:")
    video_label.pack()
    video_entry = Entry(settings_popup)
    video_entry.pack()
    video_entry.insert(0, config['DefaultSettings']['video_path'])  # Prefill with current setting

    def save_settings():
        # Update config with values from entry widgets
        config['DefaultSettings']['database_path'] = database_entry.get()
        config['DefaultSettings']['mode'] = mode_entry.get()
        config['DefaultSettings']['photo_path'] = photo_entry.get()
        config['DefaultSettings']['video_path'] = video_entry.get()

        # Write updated config back to file
        with open('config.yaml', 'w') as f:
            yaml.dump(config, f)

        settings_popup.destroy()

    # Save button
    save_button = Button(settings_popup, text="Save Settings", command=save_settings)
    save_button.pack()

    settings_popup.grab_set()
    settings_popup.wait_window(settings_popup)

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

        print("Scheduling option:", schedule_option.get())

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
        if schedule_option.get() == "2":
            specific_day = date_cal.get_date()

            # Convert specific_day to datetime object
            specific_day_obj = datetime.strptime(specific_day, "%m/%d/%y")

            # Convert specific_day_obj to Unix timestamp
            specific_day_timestamp = specific_day_obj.timestamp()

            # Get current datetime
            now = datetime.now()

            # Convert current datetime to Unix timestamp
            now_timestamp = now.timestamp()

            print("Specific day timestamp:", specific_day_timestamp)
            print("Current datetime timestamp:", now_timestamp)
            
            print(specific_day)
            cur.execute("INSERT INTO content (content_id, user_id, content_type, content_data, post_date, published) VALUES (?, ?, ?, ?, ?, ?)", (2,1,"post", "post_content", specific_day_timestamp, 0))
            conn.commit()
            # cur.execute("INSERT INTO content (content_type, post_date) VALUES (?, ?)", ("Post", specific_day_timestamp))

        post_popup.destroy()

    # Pack the submit button at the bottom of the post_popup
    submit_button = Button(post_popup, text="Submit Post", command=submit_post)
    submit_button.pack(side="bottom", pady=5)
    
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
    # Calendar header for days of the week
    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for i, name in enumerate(day_names):
        tk.Label(calendar_frame, text=name).grid(row=1, column=i)

    # Find out the first day of the month and the number of days in the month
    first_weekday, num_days = calendar.monthrange(year, month)

    # Variables to keep track of the current day and when to start counting
    day_counter = 0
    start_counting = False

    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    
    database_path = config.get('DefaultSettings').get('database_path')
    conn = sqlite3.connect(database_path)
    
    cur = conn.cursor()
    
    for row in range(2, 8):  # Allow for up to 6 weeks
        for col in range(7):  # 7 days in a week
            if start_counting or (row == 2 and col == first_weekday):
                start_counting = True
                if day_counter <= num_days:
                    # print(f"Row: {row}, Col: {col}, Day: {day_counter}")
                    # if day_counter != 0:
                    day_frame = tk.Frame(calendar_frame, height=50, width=50, bd=1, relief="ridge")
                    day_frame.grid(row=row, column=col, sticky="nsew", padx=1, pady=1)
                    if day_counter != 0:
                        day_date = date(year, month, day_counter)
                        # Convert day_date to the beginning of the day in UNIX time
                        start_of_day = datetime(day_date.year, day_date.month, day_date.day).replace(tzinfo=timezone.utc).timestamp()
                        # The end of the day in UNIX time (adding 86400 seconds which is 24 hours)
                        end_of_day = start_of_day + 86400

                        # Query the database for content within the start and end of the selected day
                        cur.execute("SELECT content_type, post_date FROM content WHERE post_date >= ? AND post_date < ?", (start_of_day, end_of_day))
                        entries = cur.fetchall()
                        print(entries)
                        # Convert each UNIX time in the results back to the desired datetime string format
                        content_text = "\n".join([f"{entry[0]} - {datetime.utcfromtimestamp(entry[1]).strftime('%Y-%m-%d %H:%M')}" for entry in entries])

                        tk.Label(day_frame, text=f"{day_counter}\n{content_text}").pack()

       

                    else:
                        tk.Label(day_frame, text="").pack()
                    day_counter += 1
                    calendar_frame.grid_columnconfigure(col, weight=1)
        calendar_frame.grid_rowconfigure(row, weight=1)
                    

select_user()

root.mainloop()