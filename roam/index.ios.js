import React, { Component } from 'react';
import PoolMain from './App/Components/PoolMain'
import XMain from './App/Components/XMain'
import {
  AppRegistry,
  StyleSheet,
  Text,
  Navigator,
  View,
  TouchableHighlight,
  TabBarIOS
} from 'react-native';

const Main = require('./App/Components/Main');
//These are just here for dev. Change the title and 
//component in <NaigatorIOS to put back the signin /up
const Time = require('./App/Components/Time');
const Host = require('./App/Components/Host');
const Dte = require('./App/Components/Dte');
const styles = require('./App/Components/Helpers/styles');
const Location = require('./App/Components/Location');''
const SignUp = require('./App/Components/Signup');
const Pending = require('./App/Components/PendingRoam');
const Confirmation =  require('./App/Components/Confirmation');
const Join = require('./App/Components/Join');
const NoRoamsLeft = require('./App/Components/NoRoamsLeft');
const EnrollConfirmation = require('./App/Components/EnrollConfirmation');

console.ignoredYellowBox = [
    'Warning: Failed propType',
    // Other warnings you don't want like 'jsSchedulingOverhead',
  ];



class roam extends Component{

constructor(props) {
  super(props);
  this.state = {selectedTab:'roam'};
}

renderScene (route, navigator) {
    if(route.name === 'Main') {
      return <Main navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'Confirmation') {
      return <Confirmation navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'Pending') {
      return <Pending navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'SignUp') {
      return <SignUp navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'Dte') {
      return <Dte navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'Host') {
      return <Host navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'Join') {
      return <Join navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'NoRoamsLeft') {
      return <NoRoamsLeft navigator={navigator} {... route.passProps}/>
    }
    if(route.name === 'EnrollConfirmation') {
      return <EnrollConfirmation navigator={navigator} {... route.passProps}/>
    }
     if(route.name === 'Time') {
      return <Time navigator={navigator} {...route.passProps}/>
    }
    if(route.name === 'Location') {
      return <Location navigator={navigator} {...route.passProps}/>
    }
}



  render() {
    return (
      
      <TabBarIOS 
        selectedTab={this.state.selectedTab}
        translucent={true}
        // style={styles.navbar}
        >
        <TabBarIOS.Item
          selected={this.state.selectedTab === 'roam'}
          // icon={require('./imgs/roam.png')}
          title="Roam"
          onPress={() => {
              this.setState({
                  selectedTab: 'roam',
              });
          }}>
            <Time />
        </TabBarIOS.Item>
        <TabBarIOS.Item
          selected={this.state.selectedTab === 'pool'}
          // icon={require('./imgs/dollar.png')}
          title="Roam Pool"
          onPress={() => {
                this.setState({
                    selectedTab: 'pool',
                });
          }}>
          <PoolMain />
        </TabBarIOS.Item>
        <TabBarIOS.Item
          selected={this.state.selectedTab === 'x'}
          // icon={require('./imgs/dollar.png')}
          title="Roam X"
          onPress={() => {
                this.setState({
                    selectedTab: 'x',
                });
          }}>
          <XMain />
        </TabBarIOS.Item>
      </TabBarIOS>
    );
  }
};

const NavigationBarRouteMapper = {
  LeftButton(route, navigator, index, navState) {
    if(index > 0) {
      return (
        <TouchableHighlight
           underlayColor="black"
           onPress={() => { if (index > 0) { navigator.pop() } }}>
          <Text style={ styles.leftNavButtonText }>Back</Text>
        </TouchableHighlight>
    )} 
    else { return null }
  },
  RightButton(route, navigator, index, navState) {
    if (route.onPress) return ( <TouchableHighlight
                                onPress={ () => route.onPress() }>
                                <Text style={ styles.rightNavButtonText }>
                                    { route.rightText || 'Right Button' }
                                </Text>
                              </TouchableHighlight> )
  },
  Title(route, navigator, index, navState) {
    return <Text style={ styles.navTitle }>roam</Text>
  }
};


// const styles = StyleSheet.create({
//   container:{
//     flex: 1,
//     backgroundColor: 'red'
//   },
// });

AppRegistry.registerComponent('roam', () => roam);
