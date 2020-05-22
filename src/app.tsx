import React from 'react';
import uuid from 'uuid/v4';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';

const Table = styled.table`
  /* border: 1px solid red; */
  border-collapse: collapse;
  td {
    border: 1px solid #aaa;
  }

  font-size: 10pt;
`;

const FieldInput = styled.input`
  /* min-width: 6em; */
  font: inherit;
  outline: none;
  border: none;
  padding: 3px;
  /* border: 1px solid #aaa; */
  &:focus {
    background: #17f4;
  }
`;

const FieldSpan = styled.div`
  min-width: 6em;
  white-space: nowrap;
  padding: 3px;
  /* border: 1px solid #aaa; */
`;

interface ExpenseInput {
  id: string;
  name: string;
  amount: number;
  payPercent: number;
  paidPercent: number;
  usuallyDue: string;
  space: boolean,
}

interface Expense {
  id: string;
  name: string;
  amount: number;
  payPercent: number;
  toPay: number;
  paidPercent: number;
  due: number;
  usuallyDue: string;
  actuallyDue: string;
  space: boolean,
}

function calculateExpense(expenseInput: ExpenseInput): Expense {
  const toPay = expenseInput.amount * expenseInput.payPercent;
  return {
    ...expenseInput,
    toPay,
    due: toPay - (toPay * expenseInput.paidPercent),
    actuallyDue: (expenseInput.paidPercent === 1
      ? '-'
      : expenseInput.usuallyDue),
  };
}

interface Currency {
  id: string;
  col: keyof Expense;
}

type AddRow = { id: string, type: 'AddRow', rowId: string };
type AddSpace = { id: string, type: 'AddSpace', rowId: string };
type MoveRow = { id: string, type: 'MoveRow', from: number, to: number };
type Edit = { id: string, type: 'Edit', current: Currency, oldVal: any, newVal: any, tab: boolean };

type Undo = { type: 'Undo' };
type Redo = { type: 'Redo' };
type SetCurrent = { type: 'SetCurrent', id: string, col: keyof Expense };
type SetExpenses = { type: 'SetExpenses', expenses: Expense[], balances: Balances };
type CleanState = { type: 'CleanState' };
type CancelEdit = { type: 'CancelEdit' };
type SetBalances = { type: 'SetBalances', balances: Balances };

type Action =
  AddRow |
  AddSpace |
  MoveRow |
  Edit;

type MetaAction =
  Action |
  Undo |
  Redo |
  SetCurrent |
  SetExpenses |
  CancelEdit |
  SetBalances |
  CleanState;

interface Balances {
  amount: number,
  toPay: number,
  due: number,
}

interface State {
  editing: Currency | null;
  actions: Action[];
  cursor: number;
  expenses: Expense[];
  balances: Balances,
  cleanActionId: string | null;
}

function doAction(state: State, action: MetaAction): State {
  switch (action.type) {
    case 'SetCurrent': {
      return {
        ...state,
        editing: { id: action.id, col: action.col },
      };
    }
    case 'CancelEdit': {
      return {
        ...state,
        editing: null,
      };
    }
    case 'CleanState': {
      return {
        ...state,
        cleanActionId: state.cursor > 0
          ? state.actions[state.cursor - 1].id
          : null,
      };
    }
    case 'SetExpenses': {
      return {
        editing: null,
        expenses: action.expenses,
        actions: [],
        balances: action.balances,
        cursor: 0,
        cleanActionId: null,
      };
    }
    case 'SetBalances': {
      return {
        editing: null,
        expenses: state.expenses,
        actions: [],
        balances: action.balances,
        cursor: 0,
        cleanActionId: null,
      };
    }
    case 'Undo': {
      if (state.cursor === 0)
        return state;

      const newState = { ...state };
      newState.cursor--;
      const newAction = newState.actions[newState.cursor];

      switch (newAction.type) {
        case 'AddRow': {
          return {
            ...newState,
            expenses: newState.expenses.slice(0, -1),
          };
        }
        case 'AddSpace': {
          return {
            ...newState,
            expenses: newState.expenses.slice(0, -1),
          };
        }
        case 'MoveRow': {
          return newState;
        }
        case 'Edit': {
          newState.expenses = newState.expenses.map(expense => {
            if (expense.id === newAction.current.id) {
              return {
                ...expense,
                [newAction.current.col]: newAction.oldVal,
              };
            }
            else {
              return expense;
            }
          });
          newState.editing = null;
          return newState;
        }
      }

      return newState;
    }
    case 'Redo': {
      if (state.cursor === state.actions.length)
        return state;

      const newState = { ...state };
      const newAction = newState.actions[newState.cursor];
      newState.cursor++;

      switch (newAction.type) {
        case 'AddRow': {
          return {
            ...newState,
            editing: {
              col: "name",
              id: newAction.rowId,
            },
            expenses: [
              ...newState.expenses,
              calculateExpense({
                id: newAction.rowId,
                name: 'Unnamed bill',
                amount: 0,
                payPercent: 1,
                paidPercent: 0,
                usuallyDue: '',
                space: false,
              }),
            ]
          };
        }
        case 'AddSpace': {
          return {
            ...newState,
            expenses: [
              ...newState.expenses,
              calculateExpense({
                id: newAction.rowId,
                name: '',
                amount: 0,
                payPercent: 1,
                paidPercent: 0,
                usuallyDue: '',
                space: true,
              }),
            ]
          };
        }
        case 'MoveRow': {
          return newState;
        }
        case 'Edit': {
          if (newAction.tab === true) {
            type EditableField = Exclude<keyof ExpenseInput, 'id' | 'space'>;
            type ColMapping = {
              [P in EditableField]: EditableField
            };
            const colMapping: ColMapping = {
              name: "amount",
              amount: "payPercent",
              payPercent: "paidPercent",
              paidPercent: "usuallyDue",
              usuallyDue: "name",
            };
            const newCurrency = { ...newAction.current };
            newCurrency.col = colMapping[newCurrency.col as EditableField];
            newState.editing = newCurrency;
          } else {
            newState.editing = null;
          }
          newState.expenses = newState.expenses.map(expense => {
            if (expense.id === newAction.current.id) {
              return calculateExpense({
                ...expense,
                [newAction.current.col]: newAction.newVal,
              });
            }
            else {
              return expense;
            }
          });
          return newState;
        }
      }

      return newState;
    }
    default: {
      const newState = { ...state };
      newState.actions = newState.actions.slice(0, newState.cursor);
      newState.actions.push(action);
      return doAction(newState, { type: 'Redo' });
    }
  }
}

const Field: React.FC<{
  kind: 'string' | 'money' | 'percent',
  editable: boolean;
  expense: Expense;
  state: State;
  dispatch: React.Dispatch<MetaAction>;
  col: keyof Expense;
}> = ({ editable, expense, state, col, kind, dispatch }) => {
  if (expense.space) {
    return <div style={{ height: '20px' }} />;
  }

  const currentlyEditing = editable &&
    state.editing !== null &&
    state.editing.id === expense.id &&
    state.editing.col === col;

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const stringValue = kind === 'string'
    ? expense[col]
    : kind === 'money'
      ? `$${Math.round(expense[col] as number * 100) / 100}`
      : `${(expense[col] as number) * 100}%`;

  React.useEffect(() => {
    if (currentlyEditing) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [currentlyEditing]);

  const cancelEdit = () => {
    dispatch({ type: 'CancelEdit' });
  };

  if (currentlyEditing) {
    return <FieldInput
      ref={inputRef}
      onBlur={cancelEdit}
      defaultValue={stringValue.toString()}
      onKeyDown={(e) => {
        if (e.keyCode === 13 || e.keyCode === 9) {
          e.preventDefault();
          let newVal: any = (e.target as HTMLInputElement).value;

          switch (kind) {
            case 'percent':
              newVal = parseFloat(newVal.replace(/%$/g, '')) / 100;
              break;
            case 'money':
              newVal = parseFloat(newVal.replace(/^\$/g, ''));
              break;
          }

          const isTab = (e.keyCode === 9)

          dispatch({
            id: uuid(),
            type: 'Edit',
            current: state.editing,
            oldVal: expense[col],
            newVal,
            tab: isTab,
          });
        }
      }}
    />;
  }
  else {
    const setCurrent = () => {
      dispatch({ type: 'SetCurrent', id: expense.id, col });
    };
    return <FieldSpan
      onDoubleClick={setCurrent}
    >
      {stringValue === '' &&
        <span dangerouslySetInnerHTML={{ __html: '&nbsp;' }} />
      }
      {stringValue}
    </FieldSpan>
  }
};

function formatAsDollar(n: number) {
  return '$' + (Math.round(n * 100) / 100);
}

const BalanceField: React.FC<{
  balances: Balances,
  setBalances: (b: Balances) => void,
  col: keyof Balances,
}> = ({ balances, setBalances, col }) => {
  const [editing, setEditing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (editing) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  return (
    editing
      ? <input
        ref={inputRef}
        defaultValue={formatAsDollar(balances[col])}
        onKeyDown={(e) => {
          if (e.keyCode === 13) {
            setEditing(false);
            setBalances({
              ...balances,
              [col]: parseFloat((e.target as HTMLInputElement).value.replace(/^\$/g, '')),
            });
          }
        }}
      />
      : <span onDoubleClick={() => setEditing(true)}>
        {formatAsDollar(balances[col])}
      </span>
  );
};

const FinalRows: React.FC<{
  expenses: Expense[],
  balances: Balances,
  setBalances: (b: Balances) => void,
}> = ({ expenses, balances, setBalances }) => {
  const totalAmount = expenses.reduce((a, b) => a + b.amount, 0);
  const totalToPay = expenses.reduce((a, b) => a + b.toPay, 0);
  const totalDue = expenses.reduce((a, b) => a + b.due, 0);

  const remainderAmount = balances.amount - totalAmount;
  const remainderToPay = balances.toPay - totalToPay;
  const remainderDue = balances.due - totalDue;

  return (
    <>
      <tr>
        <th>Total</th>
        <td>{formatAsDollar(totalAmount)}</td>
        <td></td>
        <td>{formatAsDollar(totalToPay)}</td>
        <td></td>
        <td>{formatAsDollar(totalDue)}</td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <th>Balance</th>
        <td><BalanceField balances={balances} setBalances={setBalances} col='amount' /></td>
        <td></td>
        <td><BalanceField balances={balances} setBalances={setBalances} col='toPay' /></td>
        <td></td>
        <td><BalanceField balances={balances} setBalances={setBalances} col='due' /></td>
        <td></td>
        <td></td>
      </tr>
      <tr>
        <th>Remainder</th>
        <td>{formatAsDollar(remainderAmount)}</td>
        <td></td>
        <td>{formatAsDollar(remainderToPay)}</td>
        <td></td>
        <td>{formatAsDollar(remainderDue)}</td>
        <td></td>
        <td></td>
      </tr>
    </>
  );
};

export const App: React.FC<{}> = () => {
  const [state, dispatch] = React.useReducer(doAction, {}, () => ({
    editing: null,
    actions: [],
    cursor: 0,
    balances: {
      amount: 0,
      toPay: 0,
      due: 0,
    },
    expenses: [
      calculateExpense({
        id: uuid(),
        name: 'First bill',
        amount: 0,
        payPercent: 1,
        paidPercent: 0,
        usuallyDue: '',
        space: false,
      }),
    ],
    cleanActionId: null,
  }));

  React.useEffect(() => {
    console.log('sending backend data');
    ipcRenderer.send('heres-your-data', {
      expenses: state.expenses,
      balances: state.balances,
    });
  }, [state.expenses]);

  React.useEffect(() => {
    ipcRenderer.on('opened-data', (event, data) => {
      console.log('data:', data);
      dispatch({
        type: 'SetExpenses',
        expenses: data.expenses,
        balances: data.balances,
      });
    });

    ipcRenderer.on('made-new', (event) => {
      dispatch({
        type: 'SetExpenses',
        expenses: [
          calculateExpense({
            id: uuid(),
            name: 'First bill',
            amount: 0,
            payPercent: 1,
            paidPercent: 0,
            usuallyDue: '',
            space: false,
          }),
        ],
        balances: {
          amount: 0,
          toPay: 0,
          due: 0,
        },
      });
    });

    ipcRenderer.on('clean-state', (event) => {
      dispatch({ type: 'CleanState' });
    });
  }, []);

  const addRow = () => dispatch({
    id: uuid(),
    type: 'AddRow',
    rowId: uuid(),
  });

  const addSpace = () => dispatch({
    id: uuid(),
    type: 'AddSpace',
    rowId: uuid(),
  });

  const undo = () => dispatch({ type: 'Undo' });
  const redo = () => dispatch({ type: 'Redo' });

  console.log('clean', state.cleanActionId);
  console.log('cursor', state.cursor);
  console.log('actions.length', state.actions.length);

  const isAtClean = (state.cursor === 0
    ? state.cleanActionId === null
    : state.actions[state.cursor - 1].id === state.cleanActionId);

  React.useEffect(() => {
    console.log('sending backend cleanness');
    ipcRenderer.send('whether-clean', isAtClean);
  }, [isAtClean]);

  return (
    <>
      <Table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Amount</th>
            <th>Pay Percent</th>
            <th>To Pay</th>
            <th>Paid Percent</th>
            <th>Due</th>
            <th>Usually Due</th>
            <th>Actually Due</th>
          </tr>
        </thead>
        <tbody>
          {state.expenses.map(expense => {
            return (
              expense.space
                ?
                <tr key={expense.id}>
                  <td colSpan={8} style={{ height: '20px' }} />
                </tr>
                :
                <tr key={expense.id}>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={true} kind='string' col='name' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={true} kind='money' col='amount' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={true} kind='percent' col='payPercent' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={false} kind='money' col='toPay' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={true} kind='percent' col='paidPercent' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={false} kind='money' col='due' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={true} kind='string' col='usuallyDue' /></td>
                  <td><Field expense={expense} state={state} dispatch={dispatch} editable={false} kind='string' col='actuallyDue' /></td>
                </tr>
            );
          })}
          <FinalRows
            expenses={state.expenses}
            balances={state.balances}
            setBalances={(balances) => dispatch({ type: 'SetBalances', balances })}
          />
        </tbody>
      </Table>
      <button onClick={addRow}>Add Row</button>
      <button onClick={addSpace}>Add Space</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </>
  );
};
