import logo from './logo.svg';
import './App.css';
import Web3 from 'web3';
import React, { Component, useState } from 'react';
import { ReactFlagsSelect, Ar, Br, De, Es, Fr, Hr, Ir, Ma, Pl, Pt, Rs, Sn, Us, Kr, Uy, Sa } from 'react-flags-select';





let lotteryAddress = '0x51e4DecE900035330936444d82f2a9767cE60088';
let lotteryABI = [
  {
    "constant": true,
    "inputs": [],
    "name": "last_completed_migration",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "name": "",
        "type": "address"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": false,
    "inputs": [
      {
        "name": "completed",
        "type": "uint256"
      }
    ],
    "name": "setCompleted",
    "outputs": [],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

class App extends Component {

  constructor(props) {
    super(props);

    this.state = {
      betRecords: [],
      winRecords: [],
      failRecords: [],
      pot: '0',
      challenges: ['A', 'B'],
      finalRecords: [{
        bettor:'0xabcd...',
        index:'0',
        challenges:'ab',
        answer:'ab',
        targetBlockNumber:'10',
        pot:'0'
      }]
    }

  }
 
 componentDidMount = async () => {
  await this.initWeb3();
  setInterval(this.pollData, 1000);
};

pollData = async () => {
  await this.getPot();
  await this.getBetEvents();
  await this.getWinEvents();
  await this.getFailEvents();
  this.makeFinalRecords();

}


initWeb3 = async () => {
   if (window.ethereum) {
        console.log('Recent mode')
        this.web3 = new Web3(window.ethereum);
        try {
            // Request account access if needed
            const accounts = await window.ethereum.request({
              method: 'eth_requestAccounts'
            });
            console.log(accounts)
            // Acccounts now exposed
            //web3.eth.sendTransaction({/* ... */});
        } catch (error) {
          console.log(`User denied account access error : ${error}`)
          //console.log('user denied account access error: ${error}')
            // User denied account access...
        }
    }
    // Legacy dapp browsers...
    /*else if (window.web3) {
        console.log('legacy mode')
        this.web3 = new Web3(web3.currentProvider);
        // Acccounts always exposed
       
    }
    // Non-dapp browsers...
    else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    } */
    let accounts = await this.web3.eth.getAccounts();
    this.account = accounts[0];

    this.lotteryContract = new this.web3.eth.Contract(lotteryABI, lotteryAddress);
} ;

getPot = async () => {
    
    let pot = await this.lotteryContract.methods.getPot().call();
    let potString = this.web3.utils.fromWei(pot.toString(), 'ether');
    this.setState({pot:potString})

  }

  makeFinalRecords = () => {

    let f = 0, w = 0;
    const records = [...this.state.betRecords];
    for(let i=0;i<this.state.betRecords.length;i+=1) {
      if(this.state.winRecords.length > 0 && this.state.betRecords[i].index === this.state.winRecords[w].index){
        records[i].win = 'WIN'
        records[i].answer = records[i].challenges;
        records[i].pot = this.web3.utils.fromWei(this.state.winRecords[w].amount, 'ether');
        if(this.state.winRecords.length - 1 > w) w++;

      } else if(this.state.failRecords.length > 0 && this.state.betRecords[i].index === this.state.failRecords[f].index){
        
        records[i].win = 'FAIL'
        records[i].answer = this.state.failRecords[f].answer;
        records[i].pot = 0;
        if(this.state.failRecords.length - 1 > f) f++;

      } else {
        records[i].answer = 'Not Revealed';
      }
    }

    this.setState({finalRecords:records})
  }

  getBetEvents = async () => {
    const records = [];
    let events = await this.lotteryContract.getPastEvents('BET', {fromBlock:0, toBlock:'latest'});
    
    for(let i=0;i<events.length;i+=1){
      const record = {}
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.bettor = events[i].returnValues.bettor.slice(0,4) + '...' + events[i].returnValues.bettor.slice(40,42);
      record.betBlockNumber = events[i].blockNumber;
      record.targetBlockNumber = events[i].returnValues.answerBlockNumber.toString();
      record.challenges = events[i].returnValues.challenges;
      record.win = 'Not Revealed';
      record.answer = '0x00';
      records.unshift(record);
    }

    this.setState({betRecords:records})
  }

  getFailEvents = async () => {
    const records = [];
    let events = await this.lotteryContract.getPastEvents('FAIL', {fromBlock:0, toBlock:'latest'});
    
    for(let i=0;i<events.length;i+=1){
      const record = {}
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.answer = events[i].returnValues.answer;
      records.unshift(record);
    }
    console.log(records);
    this.setState({failRecords:records})
  }

  getWinEvents = async () => {
    const records = [];
    let events = await this.lotteryContract.getPastEvents('WIN', {fromBlock:0, toBlock:'latest'});
    
    for(let i=0;i<events.length;i+=1){
      const record = {}
      record.index = parseInt(events[i].returnValues.index, 10).toString();
      record.amount = parseInt(events[i].returnValues.amount, 10).toString();
      records.unshift(record);
    }
    this.setState({winRecords:records})
  }

  bet = async () => {
    // nonce

    let challenges = '0x' + this.state.challenges[0].toLowerCase() + this.state.challenges[1].toLowerCase();
    let nonce = await this.web3.eth.getTransactionCount(this.account);
    this.lotteryContract.methods.betAndDistribute(challenges).send({from:this.account, value:5000000000000000, gas:300000, nonce:nonce})
    .on('transactionHash', (hash) =>{
      console.log(hash)
    })

  }

  // Pot money

  // bet 글자 선택 UI(버튼 형식)
  // Bet button
  
  // History table
  // index address challenge answer pot status answerBlockNumber

  onClickCard = (_Character) => {
    this.setState({
      challenges : [this.state.challenges[0], _Character]
    })
  }
  getCard = (_Character, _cardStyle) => {
    let _card = '';
    if(_Character === 'A'){
      _card = <div><p><Ir/></p><p><Ar/></p><p><Sn/></p><p><Us/></p></div>
    }
    if(_Character === 'B'){
      _card = <div><p><Sa/></p><p><Kr/></p><p><Rs/></p><p><Pl/></p></div>
    }
    if(_Character === 'C'){
      _card = <div><p><Uy/></p><p><Br/></p><p><De/></p><p><Pt/></p></div>
    }
    if(_Character === '0'){
      _card = <div><p><Es/></p><p><Fr/></p><p><Hr/></p><p><Ma/></p></div>
    }
   
   
  

    return (
      <button className={_cardStyle} onClick = {() => {this.onClickCard(_Character)}}>
        <div className ="card-body text-center">
          <p className="card-text text-center" style={{fontSize:200}}>{_card}</p>
        </div>
        <div class="ui segment">
        </div>
      </button>
    )
  }

render() {
  return (
    <div className="App">
      
      {/* Header - Pot, Betting characters */}
      <div className="container">
        <div className="jumbotron">
          <h1>Current Pot : {this.state.pot}</h1>
          <p>Qatar Worldcup</p>
          <p>Tournament</p>
          <p>Your Bet Nation</p>
        </div>
      </div>

      {/* Card section */}
      <div className="container">
        <div className="card-group">
          {this.getCard('A', 'card bg-primary')}
          {this.getCard('B', 'card bg-warning')}
          {this.getCard('C', 'card bg-danger')}
          {this.getCard('0', 'card bg-success')}
        </div>
      </div>
      <br></br>
      <div className="container">
        <button className="btn btn-danger btn-lg" onClick={this.bet}>BET!</button>
      </div>
      <br></br>
      <div className="container">
        <table className="table table-dark table-striped">
          <thead>
            <tr>
              <th>WorldcupId</th>
              <th>Address</th>
              <th>Answer</th>
              <th>Pot</th>
              <th>Status</th>
              
            </tr>
          </thead>
          <tbody>
            {
              this.state.finalRecords.map((record, index) => {
                return (
                  <tr key={index}>
                    <td>{record.index}</td>
                    <td>{record.bettor}</td>
                    <td>{record.answer}</td>
                    <td>{record.pot}</td>
                    <td>{record.win}</td>
                    
                  </tr>
                )
              })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
}


export default App;
