import React, { Component } from 'react'
import { withRouter } from 'react-router'
import { Header, Form, Loader, Table, Button, Message, Segment } from 'semantic-ui-react'
import { map, cloneDeep, reduce, includes, every } from 'lodash'
import moment from 'moment'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import '../../App.css'
const taxOptions = [
  {
    text: '0',
    value: '0'
  },
  {
    text: '6',
    value: '6'
  },
  {
    text: '12',
    value: '12'
  },
  {
    text: '21',
    value: '21'
  }
]

const entryDefaults = {
  description: '',
  amount: '',
  price: '',
  tax: '21'
}

const headerDefaults = {
  btw: '',
  company: '',
  expireDate: moment(),
  invoiceDate: moment(),
  invoiceNumber: '',
  street: '',
  town: ''
}

const numericalEntries = ['amount', 'price', 'tax']

class NewInvoice extends Component {
  constructor (props) {
    super(props)
    this.setActiveMenu = props.setActiveMenu
    this.props = props
    this.state = {
      headers: cloneDeep(headerDefaults),
      entry: cloneDeep(entryDefaults), // clone so we can clear them afterwards
      entries: [],
      saving: false,
      loading: true
    }
    this.postInvoice = props.postInvoice
    this.getInvoice = props.getInvoice
    this.updateInvoice = props.updateInvoice
  }

  componentWillMount () {
    this.setActiveMenu('new')
  }

  componentWillReceiveProps (props) {
    this.clearFields()
    const { match } = props
    const { params } = match
    const { id } = params

    if (!id) return this.setState({ loading: false })
    this.setState({ edit: true, id })
    this.getInvoice(id)
      .then(invoice => {
        const { data } = invoice
        const { entries, headers } = data
        const parsedHeaders = this.parseHeadersIn(headers)

        this.setState({
          entries,
          headers: parsedHeaders,
          loading: false
        })
      })
      .catch(() => {
        this.setState({loading: false})
        this.setState({loadingError: 'Kon factuur niet inladen'})
      })
  }

  clearFields () {
    this.setState({
      headers: cloneDeep(headerDefaults), // clone so we can clear them afterwards
      entry: cloneDeep(entryDefaults), // clone so we can clear them afterwards
      entries: [],
      saving: false,
      loading: false,
      edit: false
    })
  }

  render () {
    const { errorMessage, loading, edit, loadingError } = this.state
    return (
      <Segment basic>
        <Loader active={loading} size='medium'>Factuur inladen</Loader>
        <Header as='h2'> {edit ? 'Factuur aanpassen' : 'Nieuwe factuur'}</Header>
        <div>{ this.headerForm() }</div>
        <div>{ this.renderTable() }</div>
        {
          (errorMessage || loadingError) && (
            <Message
              negative>
              <Message.Header>Oeps</Message.Header>
              <Message.Content>{errorMessage || loadingError}</Message.Content>
            </Message>
          )
        }
        <div>
          <Button disabled={loading || loadingError} loading={this.state.saving}size='medium' floated='right' content={edit ? 'aanpassen' : 'nieuw'} positive onClick={() => this.saveInvoice()} />
        </div>
      </Segment>
    )
  }

  headerForm () {
    const { headers } = this.state
    const { company, street, town, btw, invoiceNumber, invoiceDate, expireDate } = headers

    return (
      <Form>
        <Form.Group>
          <Form.Input onChange={this.handleHeaderChange.bind(this)} label='Bedrijfsnaam' name='company' placeholder='Bedrijfsnaam' value={company} required width={4} />
          <Form.Input onChange={this.handleHeaderChange.bind(this)} label='Straat' name='street' placeholder='Straat' value={street} required width={4} />
          <Form.Input onChange={this.handleHeaderChange.bind(this)} label='Gemeente' name='town' placeholder='Gemeente' value={town} required width={4} />
        </Form.Group>
        <Form.Group>
          <Form.Input onChange={this.handleHeaderChange.bind(this)} label='BTW-nummer' name='btw' placeholder='BTW-nummer' value={btw} required width={4} />
          <Form.Input onChange={this.handleHeaderChange.bind(this)} label='Factuurnummer' name='invoiceNumber' placeholder='Factuurnummer' value={invoiceNumber} required width={4} />
          <Form.Field required width={2}>
            <label>Factuur datum</label>
            <DatePicker
              style={{width: '100%'}}
              selected={invoiceDate}
              onChange={this.setInvoiceDate.bind(this)}
              dateFormat={'DD/MM/YYYY'}
            />
          </Form.Field>
          <Form.Field required width={2}>
            <label>Vervaldag</label>
            <DatePicker
              style={{width: '100%'}}
              selected={expireDate}
              onChange={this.setExpireDate.bind(this)}
              dateFormat={'DD/MM/YYYY'}
            />
          </Form.Field>
        </Form.Group>
      </Form>
    )
  }

  setExpireDate (date) {
    const newHeaders = Object.assign(this.state.headers, { expireDate: date })
    this.setState({ headers: newHeaders })
  }

  setInvoiceDate (date) {
    const newHeaders = Object.assign(this.state.headers, { invoiceDate: date })
    this.setState({ headers: newHeaders })
  }

  handleHeaderChange (e, {name, value}) {
    const newHeaders = Object.assign(this.state.headers, { [name]: value })
    this.setState({ headers: newHeaders })
  }

  renderTable () {
    return (
      <Table celled style={{marginBottom: '30px'}}>
        {this.renderTableHeader()}
        {this.renderTableBody()}
        {this.renderTableFooter()}
      </Table>
    )
  }

  renderTableHeader () {
    return (
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Omschrijving</Table.HeaderCell>
          <Table.HeaderCell>Aantal</Table.HeaderCell>
          <Table.HeaderCell>Prijs</Table.HeaderCell>
          <Table.HeaderCell>BTW %</Table.HeaderCell>
          <Table.HeaderCell>Totaal</Table.HeaderCell>
        </Table.Row>
      </Table.Header>
    )
  }

  renderTableBody () {
    const { entries } = this.state
    return (
      <Table.Body>
        { map(entries, this.renderTableEntry.bind(this))}
        { this.renderTotalEntry(entries)}
      </Table.Body>
    )
  }

  renderTableFooter () {
    const { entry, loading } = this.state
    const { description, amount, price, tax } = entry
    return (
      <Table.Footer>
        <Table.Row>
          <Table.HeaderCell>
            <Form.Input onChange={this.handleEntryChange.bind(this)} name='description' placeholder='Omschrijving' value={description} />
          </Table.HeaderCell>
          <Table.HeaderCell>
            <Form.Input onChange={this.handleEntryChange.bind(this)} name='amount' placeholder='Aantal' value={amount} />
          </Table.HeaderCell>
          <Table.HeaderCell>
            <Form.Input onChange={this.handleEntryChange.bind(this)} name='price' placeholder='Prijs' value={price} />
          </Table.HeaderCell>
          <Table.HeaderCell>
            <Form.Dropdown onChange={this.handleEntryChange.bind(this)} name='tax' placeholder='BTW' value={tax} options={taxOptions} />
          </Table.HeaderCell>
          <Table.HeaderCell textAlign='center'>
            <Form onSubmit={this.handleEntrySubmit.bind(this)}>
              <Button disabled={loading} style={{'height': '50%'}} positive circular icon='plus square outline' />
            </Form>
          </Table.HeaderCell>
        </Table.Row>
      </Table.Footer>
    )
  }

  renderTableEntry (entry, index) {
    const { description, amount, price, tax } = entry
    const totalPrice = this.calculatePrice(amount, price, tax)
    return (
      <Table.Row key={index}>
        <Table.Cell>{description}</Table.Cell>
        <Table.Cell>{amount}</Table.Cell>
        <Table.Cell>{price}</Table.Cell>
        <Table.Cell>{tax}</Table.Cell>
        <Table.Cell>{totalPrice}</Table.Cell>
      </Table.Row>
    )
  }

  renderTotalEntry (entries) {
    return (
      <Table.Row textAlign='right'>
        <Table.Cell colSpan='5' positive style={{'fontSize': '150%', paddingTop: '20px', 'borderTop': '2px solid black'}}>
          { this.getTotalAmount(entries).toFixed(2)}
        </Table.Cell>
      </Table.Row>
    )
  }

  getTotalAmount (entries) {
    return reduce(entries, (acc, entry) => {
      const { amount, price, tax } = entry
      const totalPrice = this.calculatePrice(amount, price, tax)
      acc += totalPrice
      return acc
    }, 0)
  }

  calculatePrice (amount, price, tax) {
    return parseFloat(((parseFloat(amount, 10) * parseFloat(price, 10)) * (1 + (parseFloat(tax, 10) / 100))).toFixed(2))
  }

  handleEntryChange (e, {name, value}) {
    const newEntry = Object.assign(this.state.entry, { [name]: value })
    this.setState({ entry: newEntry })
  }

  handleEntrySubmit () {
    this.setState({errorMessage: ''})
    const { entry, entries } = this.state
    const validEntry = this.validateEntry(entry)
    if (!validEntry) {
      this.setState({errorMessage: 'zorg dat er cijfers worden ingevuld waar nodig'})
      return
    }
    entries.push(entry)
    this.setState({ entries })
    this.setState({ entry: cloneDeep(entryDefaults) })
  }

  validateEntry (entry) {
    return every(entry, (val, key) => {
      if (!includes(numericalEntries, key)) return true
      return !isNaN(parseFloat(val, 10))
    })
  }

  validateHeaders () {
    const { headers } = this.state
    return every(headers, (val, key) => !!val)
  }

  saveInvoice () {
    const { edit, id } = this.state
    this.setState({
      saving: true,
      errorMessage: ''
    })
    const { entries, headers } = this.state
    const isValid = this.validateHeaders()
    if (!isValid) {
      this.setState({
        saving: false,
        errorMessage: 'er ontbreken contact gegevens'
      })
      return
    }
    const parsedHeaders = this.parseHeadersOut(headers)
    const body = Object.assign({}, {entries}, {headers: parsedHeaders})
    const savePromise = edit ? this.updateInvoice(body, id) : this.postInvoice(body)

    savePromise
      .then(() => this.setState({ saving: false }))
      .catch(() => this.setState({ saving: false, errorMessage: 'kon niet opslaan, probeer later nog eens' }))
  }

  parseHeadersOut (headers) {
    const headerCopy = cloneDeep(headers)
    return reduce(headerCopy, (acc, val, name) => {
      if (val instanceof moment) acc[name] = val.unix()
      return acc
    }, headerCopy)
  }

  parseHeadersIn (headers) {
    const headerCopy = cloneDeep(headers)
    const dateKeysToParse = ['expireDate', 'invoiceDate']
    return reduce(headerCopy, (acc, val, name) => {
      if (includes(dateKeysToParse, name)) acc[name] = moment.unix(val)
      return acc
    }, headerCopy)
  }
}

export default withRouter(NewInvoice)
