package com.example.unitix.models;

import android.util.Log;

import org.json.JSONObject;

public class ShowInfo extends Model {
    Event event;
    String name;
    int capacity;
    int ticketsSold;
    double price;
    String startTime;
    String endTime;
    String startDate;
    String endDate;
    String description;
    String location;

    public ShowInfo(JSONObject jo) {
        try {
            // TODO: fix parsing
            this.name = (String) jo.get("name");
            this.capacity = (Integer) jo.get("capacity");
            this.ticketsSold = jo.optInt("ticketsSold", 0);
            this.description = (String) jo.get("description");
            this.location = (String) jo.get("location");
            this.id = jo.getString("_id");
            this.price = Double.parseDouble((String) jo.getJSONObject("price").get("$numberDecimal"));
            this.isValid = true;
            this.startTime = jo.optString("start_time");
            this.endTime = jo.optString("end_time");
            this.startDate = jo.optString("start_date");
            this.endDate =  jo.optString("end_date");


        } catch (Exception e) {
            //Log.e("NOAH","exception in show" + e);
            //Log.e("NOAH",jo.toString());
            this.isValid = false;
        }
    }

    public String getPrettyPrice() {
        try {
            String[] parts = ("" + price).split("\\.");
            if (parts[1].length() < 2) {
                parts[1] = parts[1] + "0";
            }
            return "$" + parts[0] + "." + parts[1];
        } catch (Exception e) {
            return "$" + price;
        }
    }

    public int compareTo(Show other) {
        try {
            String[] partsOne = this.startDate.split("-");
            String[] partsTwo = other.startDate.split("-");
            int yearOne = Integer.parseInt(partsOne[0]);
            int yearTwo = Integer.parseInt(partsTwo[0]);
            int monthOne = Integer.parseInt(partsOne[2]);
            int monthTwo = Integer.parseInt(partsTwo[2]);
            int dayOne = Integer.parseInt(partsOne[1]);
            int dayTwo = Integer.parseInt(partsTwo[1]);
            if (yearOne != yearTwo) {
                return -yearOne + yearTwo;
            } else if (monthOne != monthOne){
                return -monthOne + monthTwo;
            } else if (dayOne != dayTwo) {
                return -dayOne + dayTwo;
            } else {
                int hourOne = Integer.parseInt(this.startTime.split(":")[0]);
                int hourTwo = Integer.parseInt(other.startTime.split(":")[0]);
                int minOne = Integer.parseInt(this.startTime.split(":")[1]);
                int minTwo = Integer.parseInt(other.startTime.split(":")[1]);
                if (hourOne != hourTwo) {
                    return hourTwo - hourOne;
                } else {
                    return minTwo - minOne;
                }
            }
        } catch (Exception e) {
            return -1;
        }
    }

    @Override
    public String toString() {
        return new StringBuilder()
                .append(name)
                .append(" ")
                .append(getPrettyStartTime())
                .append(getPrettyEndTime())
                .append(" ticketsRemaining: ")
                .append(capacity - ticketsSold)
                .toString();
    }

    public String getPrettyStartDate() {
        if (startDate == null) {
            return "";
        }
        String date = startDate.split("T")[0];
        // TODO: use time class or something to make pretty
        return date;
    }

    public String getPrettyTimeRange() {
        String start = getPrettyStartTime();
        String end = getPrettyEndTime();
        if (start.equals("")) {
            return "TIME N/A";
        }
        return start + " - " + end;
    }
    private static String getPrettyTime(String time) {
        if (time == null || time.equals("")) {
            return "";
        }
        String[] parts = time.split(":");
        int hour = Integer.parseInt(parts[0]);
        String min = parts[1];
        String end = "AM";
        // fix 24 hour clock
        if (hour > 12) {
            end = "PM";
            hour = hour % 12;
        }
        // fix integer minute parsing
        if (min.length() < 2) {
            min = "0" + min;
        }
        return hour + ":" + min + " " + end;
    }

    public String getPrettyStartTime() {
        return getPrettyTime(startTime);
    }

    public String getPrettyEndTime() {
        return getPrettyTime(endTime);
    }

    // TODO: handle ticket purchasing



    public boolean isSoldOut() {
        return ticketsSold >= capacity;
    }

    public String getDescription() {
        return this.description;
    }




}
