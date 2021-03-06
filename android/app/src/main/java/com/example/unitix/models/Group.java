package com.example.unitix.models;

import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Group extends Model {

    String[] currentEvents;
    String[] pastEvents;
    String displayName;
    String email;
    String password; // might delete
    String groupType;
    String bio;
    String[] followers;

    public Group(JSONObject jo) {
        try {
            this.id = jo.getString("_id");
            // TODO - get events
            this.displayName = jo.getString("displayName");
            this.email = jo.getString("email");
            this.groupType = jo.getString("groupType");
            this.bio = jo.getString("bio");
//            this.followers = jo.getJSONArray("followers");
            JSONArray arr = jo.getJSONArray("followers");
            List<String> list = new ArrayList<String>();
            for(int i = 0; i < arr.length(); i++){
                list.add(arr.get(i).toString());
            }
            this.followers = list.toArray(new String[0]);
            this.isValid = true;
        } catch (Exception e) {
            //Log.e("MICHAEL", "Exception making Group: " + e);
            isValid = false;
        }
    }

    public static Group[] createGroupList(JSONArray jarray) {
        List<Group> list = new ArrayList<Group>();
        for (int i = 0; i < jarray.length(); i++) {
            try {
                Group g = new Group(jarray.getJSONObject(i));
                if (g.isValid) {
                    list.add(g);
                }
            } catch (JSONException e) {
                //Catch Exception
            }
        }
        return list.toArray(new Group[0]); //Return list as an array
    }

    public String getDisplayName() {
        return this.displayName;
    }

    public String getBio() {
        return this.bio;
    }

    public String getID() {
        return this.id;
    }
    
    @Override
    public String toString() {
        return this.displayName + " has " + this.followers.length + " followers.";
    }
}
