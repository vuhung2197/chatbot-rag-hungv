import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createStackNavigator} from '@react-navigation/stack';
import ChatScreen from '../screens/ChatScreen';
import KnowledgeAdminScreen from '../screens/KnowledgeAdminScreen';
import EmailSubscriptionScreen from '../screens/EmailSubscriptionScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import {useAuth} from '../context/AuthContext';
import {View, Text, TouchableOpacity, StyleSheet, Alert} from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AuthStack: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
};

const MainTabs: React.FC = () => {
  const {userRole, logout} = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        {text: 'Hủy', style: 'cancel'},
        {text: 'Đăng xuất', style: 'destructive', onPress: logout},
      ],
    );
  };

  return (
    <>
      <View style={styles.topBar}>
        <Text style={styles.appTitle}>📚 Knowledge Chatbot</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
      
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#7137ea',
          tabBarInactiveTintColor: '#999',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopWidth: 1,
            borderTopColor: '#eee',
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
        }}>
        <Tab.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            title: 'Tra cứu',
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>💬</Text>
            ),
          }}
        />
        
        <Tab.Screen
          name="KnowledgeAdmin"
          component={KnowledgeAdminScreen}
          options={{
            title: 'Quản lý KB',
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>📚</Text>
            ),
          }}
        />
        
        <Tab.Screen
          name="EmailSubscription"
          component={EmailSubscriptionScreen}
          options={{
            title: 'Email',
            tabBarIcon: ({color}) => (
              <Text style={{fontSize: 20, color}}>📧</Text>
            ),
          }}
        />
      </Tab.Navigator>
    </>
  );
};

const AppNavigator: React.FC = () => {
  const {isAuthenticated, loading} = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Đang tải...</Text>
      </View>
    );
  }

  return isAuthenticated ? <MainTabs /> : <AuthStack />;
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#7137ea',
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingTop: 50, // For status bar
  },
  appTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});

export default AppNavigator;