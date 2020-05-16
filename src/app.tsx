import React from 'react';
import uuid from 'uuid/v4';
import styled from 'styled-components';

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

type AddRow = { type: 'AddRow' };
type MoveRow = { type: 'MoveRow', from: number, to: number };
type Edit = { type: 'Edit', current: Currency, oldVal: any, newVal: any };
type Undo = { type: 'Undo' };
type Redo = { type: 'Redo' };

type Action = AddRow | MoveRow | Edit | Undo | Redo;

// const actions: Action[] = [];

// function clickAddRowButton() {
//   actions.push({
//     type: 'AddRow',
//   });
// }

interface State {
  currency: Currency | null;
  actions: Action[];
  cursor: number;
  expenses: Expense[];
}

function doAction(state: State, action: Action): State {
  switch (action.type) {
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
                id: uuid(),
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
          return newState;
        }
      }

      return newState;
    }
    default: {
      return doAction(
        {
          ...state,
          actions: [...state.actions, action]
        },
        { type: 'Redo' }
      );
    }
  }
}

const Table = styled.table`
  border: 1px solid red;

  td {
    border: 1px solid blue;
  }
`;

export const App: React.FC<{}> = () => {
  const [state, dispatch] = React.useReducer(doAction, {
    currency: null,
    actions: [],
    cursor: 0,
    expenses: [],
  });

  const addRow = () => dispatch({ type: 'AddRow' });

  const undo = () => dispatch({ type: 'Undo' });
  const redo = () => dispatch({ type: 'Redo' });

  return (
    <>
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
                <td>{expense.name}</td>
                <td>{expense.amount}</td>
                <td>{expense.payPercent}</td>
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


// const Td = styled.td`
//   border: 1px solid red;
// `;

// const Field: React.FC<{
//   fieldName: keyof RowData,
//   row: RowData,
//   editing: keyof RowData | null,
//   setEditing: (o: { id: string, field: keyof RowData } | null) => void,
//   updateRow: (id: string, key: keyof RowData, val: any) => void,
// }> = ({ editing, setEditing, row, updateRow, fieldName }) => {
//   return (
//     editing === fieldName ?
//       <input defaultValue={row[fieldName]} onKeyDown={(e) => {
//         if (e.keyCode === 13) {
//           setEditing(null);
//           updateRow(row.id, fieldName, (e.target as HTMLInputElement).value);
//         }
//       }} /> :
//       <span onDoubleClick={() => setEditing({ id: row.id, field: fieldName })}>
//         {row[fieldName]}
//       </span>
//   );
// };

// const Row: React.FC<{ rowData: RowData, updateRow: (id: string, key: keyof RowData, val: any) => void }> = ({ rowData, updateRow }) => {
//   return (
//     <tr key={rowData.id}>
//       <Td><Field row={rowData} fieldName="name" /></Td>
//       <Td><Field row={rowData} fieldName="amount" /></Td>
//       <Td><Field row={rowData} fieldName="paidPercent" /></Td>
//       <Td>{rowData.toPay}</Td>
//       <Td>{rowData.paidPercent}</Td>
//       <Td>{rowData.due}</Td>
//       <Td>{rowData.usuallyDue}</Td>
//       <Td>{rowData.actuallyDue}</Td>
//     </tr>
//   );
// };

// const AppContext = React.createContext<{
//   rows: RowData[],
//   activeCell: null | {
//     rowId: string,
//     columnName: keyof RowData,
//   },
// }>({
//   rows: [],
//   activeCell: null,
// });
