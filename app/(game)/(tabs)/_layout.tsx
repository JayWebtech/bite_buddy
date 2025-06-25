import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, Text } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Blockblueprint',
        },
        tabBarStyle: Platform.select({
          ios: {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderTopColor: 'transparent',
            borderTopWidth: 0,
            height: 80,
            position: 'absolute',
            elevation: 0,
            shadowOpacity: 0,
          },
          default: {
            backgroundColor: 'rgba(0, 0, 0, 0)',
            borderTopColor: 'transparent',
            borderTopWidth: 0,
            height: 80,
            position: 'absolute',
            elevation: 0,
            shadowOpacity: 0,
          },
        }),
      }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'My Pet',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "dog" : "dog"}
              size={24}
              color={focused ? Colors.primary : "#8A8A8A"}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text style={{fontSize: 10, fontFamily: 'Blockblueprint', color: '#FFFFFF'}}>My Pet</Text> : undefined,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Blockblueprint',
          },
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Collection',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "cards" : "cards-outline"}
              size={24}
              color={focused ? Colors.primary : "#8A8A8A"}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text style={{fontSize: 10, fontFamily: 'Blockblueprint', color: '#FFFFFF'}}>Collection</Text> : undefined,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Blockblueprint',
          },
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "qrcode-scan" : "qrcode-scan"}
              size={24}
              color={focused ? Colors.primary : "#8A8A8A"}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text style={{fontSize: 10, fontFamily: 'Blockblueprint', color: '#FFFFFF'}}>Scan</Text> : undefined,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Blockblueprint',
          },
        }}
      />
      <Tabs.Screen
        name="battle"
        options={{
          title: 'Battle',
          tabBarIcon: ({ focused }) => (
            <MaterialCommunityIcons
              name={focused ? "sword-cross" : "sword"}
              size={24}
              color={focused ? Colors.primary : "#8A8A8A"}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text style={{fontSize: 10, fontFamily: 'Blockblueprint', color: '#FFFFFF'}}>Battle</Text> : undefined,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Blockblueprint',
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={focused ? Colors.primary : "#8A8A8A"}
            />
          ),
          tabBarLabel: ({ focused }) => focused ? <Text style={{fontSize: 10, fontFamily: 'Blockblueprint', color: '#FFFFFF'}}>Profile</Text> : undefined,
          tabBarLabelStyle: {
            fontSize: 10,
            fontFamily: 'Blockblueprint',
          },
        }}
      />
    </Tabs>
  );
} 