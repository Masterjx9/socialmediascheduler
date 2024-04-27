import tkinter as tk
from datetime import date, datetime, timezone, time, timedelta
import calendar
import yaml
import sqlite3
from globals import calendar_frame, month_year_label, month, year
import utils
import pytz

textObjectDict = {}
saveDict = {}

def print_month_year(month, year):
    global month_year_label
    written_month = date(year, month, 1).strftime('%B')
    month_year_label = tk.Label(calendar_frame, text=f"{written_month} {year}", font=("Arial", 20))
    month_year_label.grid(column=2, row=0, columnspan=3)

def switch_months(config_path, direction):
    global month, year
    if direction == 1 and month == 12:
        month = 1
        year += 1
    elif direction == -1 and month == 1:
        month = 12
        year -= 1
    else:
        month += direction
    rebuild_calendar(config_path)

def rebuild_calendar(config_path):
    global calendar_frame
    for widget in calendar_frame.winfo_children():
        widget.destroy()
    print_month_year(month, year)
    make_buttons(config_path)
    month_generator(config_path)

def make_buttons(config_path):
    go_back = tk.Button(calendar_frame, text="<", command=lambda: switch_months(config_path, -1))
    go_back.grid(column=0, row=0)
    go_forward = tk.Button(calendar_frame, text=">", command=lambda: switch_months(config_path, 1))
    go_forward.grid(column=6, row=0)

def month_generator(config_path):
    # Calendar header for days of the week
    day_names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    for i, name in enumerate(day_names):
        tk.Label(calendar_frame, text=name).grid(row=1, column=i)

    # Find out the first day of the month and the number of days in the month
    first_weekday, num_days = calendar.monthrange(year, month)

    # Variables to keep track of the current day and when to start counting
    day_counter = 0
    start_counting = False

    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    my_tz = pytz.timezone(config['DefaultSettings']['timezone'])
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
                        cur.execute("SELECT content_id, content_type, post_date FROM content WHERE post_date >= ? AND post_date < ?", (start_of_day, end_of_day))
                        entries = cur.fetchall()
                        tk.Label(day_frame, text=f"{day_counter}").pack()
                        for entry in entries:
                            content_id = entry[0]
                            content_type = entry[1]
                            content_date = entry[2]
                            print(content_id)
                            print(content_type)
                            print(content_date)
                            content_text = f"{content_type} - {datetime.fromtimestamp(content_date, tz=my_tz).strftime('%Y-%m-%d %H:%M')}"
                            content_label = tk.Label(day_frame, text=f"{content_text}")
                            if content_type == "image":
                                content_label.bind("<Button-1>", lambda event, mode="calendar", cid=content_id: utils.add_photo(mode, cid))
                            if content_type == "video":
                                content_label.bind("<Button-1>", lambda event, mode="calendar", cid=content_id: utils.add_video(mode, cid))
                            if content_type == "post":
                                content_label.bind("<Button-1>", lambda event, mode="calendar", cid=content_id: utils.add_post(mode, cid))
                            content_label.bind("<Button-3>", lambda event, cid=content_id: utils.delete_content(cid))
                            content_label.pack()


                    else:
                        tk.Label(day_frame, text="").pack()
                    day_counter += 1
                    calendar_frame.grid_columnconfigure(col, weight=1)
        calendar_frame.grid_rowconfigure(row, weight=1)
                    