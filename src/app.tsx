import React from 'react';
import uuid from 'uuid/v4';
import styled from 'styled-components';

const Td = styled.td`
  border: 1px solid red;
`;

interface RowData {
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

const Field: React.FC<{
  fieldName: keyof RowData,
  row: RowData,
  editing: keyof RowData | null,
  setEditing: (o: { id: string, field: keyof RowData } | null) => void,
  updateRow: (id: string, key: keyof RowData, val: any) => void,
}> = ({ editing, setEditing, row, updateRow, fieldName }) => {
  return (
    editing === fieldName ?
      <input defaultValue={row[fieldName]} onKeyDown={(e) => {
        if (e.keyCode === 13) {
          setEditing(null);
          updateRow(row.id, fieldName, (e.target as HTMLInputElement).value);
        }
      }} /> :
      <span onDoubleClick={() => setEditing({ id: row.id, field: fieldName })}>
        {row[fieldName]}
      </span>
  );
};

const Row: React.FC<{ rowData: RowData, updateRow: (id: string, key: keyof RowData, val: any) => void }> = ({ rowData, updateRow }) => {
  return (
    <tr key={rowData.id}>
      <Td><Field row={rowData} fieldName="name" /></Td>
      <Td><Field row={rowData} fieldName="amount" /></Td>
      <Td><Field row={rowData} fieldName="paidPercent" /></Td>
      <Td>{rowData.toPay}</Td>
      <Td>{rowData.paidPercent}</Td>
      <Td>{rowData.due}</Td>
      <Td>{rowData.usuallyDue}</Td>
      <Td>{rowData.actuallyDue}</Td>
    </tr>
  );
};

const AppContext = React.createContext<{
  rows: RowData[],
  activeCell: null | {
    rowId: string,
    columnName: keyof RowData,
  },
}>({
  rows: [],
  activeCell: null,
});

export const App: React.FC<{}> = () => {
  const [rows, setRows] = React.useState([] as RowData[]);
  const [editing, setEditing] = React.useState<{
    id: string,
    field: keyof RowData,
  } | null>(null);

  const addRow = () => {
    setRows(rows => [...rows, {
      id: uuid(),
      name: 'Unnamed bill',
      amount: 0,
      payPercent: 0,
      toPay: 0,
      paidPercent: 0,
      due: 0,
      usuallyDue: '',
      actuallyDue: '',
    }]);
  };

  // const updateRow = (val: any) => {
  //   setRows(rows => rows.map(row => {
  //     if (row.id === editing.id) {
  //       return { ...row, [editing.field]: val };
  //     }
  //     else {
  //       return row;
  //     }
  //   }));
  // };

  return (
    <>
      <table style={{ border: '1px solid red' }}>
        <thead>
          <tr>
            <td>Bill</td>
            <td>Amount</td>
            <td>Pay %</td>
            <td>To Pay</td>
            <td>Paid %</td>
            <td>Due</td>
            <td>Usually Due</td>
            <td>Actually Due</td>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <Row rowData={row} key={row.id} />
          ))}
        </tbody>
      </table>
      <button onClick={addRow}>Add row</button>
    </>
  );
};
