import React from 'react';

export const App = () => {
  const [count, setCount] = React.useState(0);
  return (
    <>
      <button onClick={() => setCount(c => c + 1)}>change</button>
      <div>test {count}</div>
    </>
  );
};
