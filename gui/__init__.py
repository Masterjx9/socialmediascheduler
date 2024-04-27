import tkinter as tk
from tkinter import filedialog, \
                    Text, Menu, \
                    Toplevel, Radiobutton, \
                    StringVar, messagebox, \
                    Entry, Button, Label
import webbrowser
from datetime import date
import yaml
import sqlite3
from globals import root, calendar_frame, month_year_label, month, year
import utils_calendar
import utils

# First thing to do is to create a root window, then hide it until the user selects a user or a user is already selected
root.withdraw()

# Load the content scheduler window
def initialize_main_window():
    global calendar_frame, month_year_label, month, year
    root.title("Content Scheduler")
    root.geometry("500x400")  

    menu_bar = Menu(root)
    root.config(menu=menu_bar)

    accounts_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Accounts", menu=accounts_menu)
    accounts_menu.add_command(label="Manage Accounts", command=lambda: open_accounts(root))

    content_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Content", menu=content_menu)
    content_menu.add_command(label="Add Photo", command=utils.add_photo)
    content_menu.add_command(label="Add Video", command=utils.add_video)
    content_menu.add_command(label="Add Post", command=lambda: utils.add_post(root))

    settings_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Settings", menu=settings_menu)
    settings_menu.add_command(label="Manage Settings", command= open_settings)

    help_menu = Menu(menu_bar, tearoff=0)
    menu_bar.add_cascade(label="Help", menu=help_menu)
    help_menu.add_command(label="Help/Support", command=open_support)
    help_menu.add_command(label="About")

    month = date.today().month
    year = date.today().year

    utils_calendar.print_month_year(month, year)
    utils_calendar.make_buttons()
    utils_calendar.month_generator()
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
    
select_user()

root.mainloop()    