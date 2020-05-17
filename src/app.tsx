import React from 'react';
import uuid from 'uuid/v4';
import styled from 'styled-components';
import { ipcRenderer } from 'electron';

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
}

interface Currency {
  id: string;
  col: keyof Expense;
}

type AddRow = { id: string, type: 'AddRow', rowId: string };
type MoveRow = { id: string, type: 'MoveRow', from: number, to: number };
type Edit = { id: string, type: 'Edit', current: Currency, oldVal: any, newVal: any };

type Undo = { type: 'Undo' };
type Redo = { type: 'Redo' };
type SetCurrent = { type: 'SetCurrent', id: string, col: keyof Expense };
type SetExpenses = { type: 'SetExpenses', expenses: Expense[] };
type CleanState = { type: 'CleanState' };

type Action =
  AddRow |
  MoveRow |
  Edit;

type MetaAction =
  Action |
  Undo |
  Redo |
  SetCurrent |
  SetExpenses |
  CleanState;

interface State {
  editing: Currency | null;
  actions: Action[];
  cursor: number;
  expenses: Expense[];
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
    case 'CleanState': {
      return {
        ...state,
        cleanActionId: state.actions.length > 0
          ? state.actions[state.actions.length - 1].id
          : null,
      };
    }
    case 'SetExpenses': {
      return {
        editing: null,
        expenses: action.expenses,
        actions: [],
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
            expenses: [
              ...newState.expenses,
              {
                id: newAction.rowId,
                name: 'Unnamed bill',
                amount: 0,
                payPercent: 1,
                toPay: 0,
                paidPercent: 0,
                due: 0,
                usuallyDue: '',
                actuallyDue: '',
              }
            ]
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
                [newAction.current.col]: newAction.newVal,
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
    default: {
      const newState = { ...state };
      newState.actions = newState.actions.slice(0, newState.cursor);
      newState.actions.push(action);
      return doAction(newState, { type: 'Redo' });
    }
  }
}

const Table = styled.table`
  border: 1px solid red;

  td {
    border: 1px solid blue;
  }
`;

const Field: React.FC<{
  expense: Expense;
  state: State;
  dispatch: React.Dispatch<MetaAction>;
  col: keyof Expense;
}> = ({ expense, state, col, dispatch }) => {
  const current = state.editing !== null &&
    state.editing.id === expense.id &&
    state.editing.col === col;

  if (current) {
    return <input
      defaultValue={expense[col]}
      onKeyDown={(e) => {
        if (e.keyCode === 13) {
          dispatch({
            id: uuid(),
            type: 'Edit',
            current: state.editing,
            oldVal: expense[col],
            newVal: (e.target as HTMLInputElement).value,
          });
        }
      }}
    />;
  }
  else {
    const setCurrent = () => {
      dispatch({ type: 'SetCurrent', id: expense.id, col });
    };
    return <span onDoubleClick={setCurrent}>{expense[col]}</span>
  }
};

export const App: React.FC<{}> = () => {
  const [state, dispatch] = React.useReducer(doAction, {
    editing: null,
    actions: [],
    cursor: 0,
    expenses: [],
    cleanActionId: null,
  });

  React.useEffect(() => {
    console.log('sending backend data');
    ipcRenderer.send('heres-your-data', state.expenses);
  }, [state.expenses]);

  React.useEffect(() => {
    ipcRenderer.on('opened-data', (event, expenses) => {
      dispatch({ type: 'SetExpenses', expenses });
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

  const undo = () => dispatch({ type: 'Undo' });
  const redo = () => dispatch({ type: 'Redo' });

  console.log('clean', state.cleanActionId);
  console.log('cursor', state.cursor);
  console.log('actions.length', state.actions.length);

  const isAtClean = (state.cursor === 0
    ? state.cleanActionId === null
    : state.actions[state.cursor - 1].id === state.cleanActionId);

  return (
    <>
      {isAtClean ? <span>Clean!</span> : <span>Dirty.</span>}
      <Table>
        <thead>
          <tr>
            <th>name</th>
            <th>amount</th>
            <th>payPercent</th>
            <th>toPay</th>
            <th>paidPercent</th>
            <th>due</th>
            <th>usuallyDue</th>
            <th>actuallyDue</th>
          </tr>
        </thead>
        <tbody>
          {state.expenses.map(expense => {
            return (
              <tr key={expense.id}>
                <td><Field expense={expense} state={state} dispatch={dispatch} col='name' /></td>
                <td><Field expense={expense} state={state} dispatch={dispatch} col='amount' /></td>
                <td><Field expense={expense} state={state} dispatch={dispatch} col='payPercent' /></td>
                <td>{expense.toPay}</td>
                <td>{expense.paidPercent}</td>
                <td>{expense.due}</td>
                <td>{expense.usuallyDue}</td>
                <td>{expense.actuallyDue}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
      <button onClick={addRow}>Add Row</button>
      <button onClick={undo}>Undo</button>
      <button onClick={redo}>Redo</button>
    </>
  );
};
