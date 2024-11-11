import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
    fullScreenModal: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    calendarContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'black',
    },
    title: {
      fontSize: 24,
      color: 'white',
      marginBottom: 20,
    },
    captureContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    capture: {
      backgroundColor: '#fff',
      borderRadius: 5,
      padding: 15,
      paddingHorizontal: 20,
      alignSelf: 'center',
      margin: 20,
    },
    captureText: {
      fontSize: 14,
    },
    textInput: {
      height: 40,
      borderColor: 'gray',
      borderWidth: 1,
      margin: 20,
      padding: 10,
      color: 'white',
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dbText: {
      color: 'white',
    },
    footerNavBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 60,
      backgroundColor: '#f8f8f8',
      borderTopWidth: 1,
      borderColor: '#e7e7e7',
      position: 'absolute',
      bottom: 0,
      width: '100%',
    },
    navButton: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    disabledButton: {
      backgroundColor: '#d3d3d3', // Grey background for disabled state
    },
    disabledText: {
      color: '#a9a9a9', // Grey text color for disabled state
    },
    loginButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      margin: 10,
      backgroundColor: '#f0f0f0',
      borderRadius: 5,
    },
    loginText: {
      marginLeft: 10,
      fontSize: 18,
    },
    listContainer: {
      marginTop: 10,
      padding: 10,
      backgroundColor: '#f9f9f9',
      borderRadius: 5,
    },
    
    listItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: '#ddd',
    },
    iconContainer: {
      flexDirection: 'row',
    },
    icon: {
      marginLeft: 10,
    },
    listItemText: {
      fontSize: 16,
      flex: 1
    },
    listItemContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
    }
  });

export default styles;