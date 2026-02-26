export const buttonMap = new Map();
export const groupMap = new Map();

let columnsInstance = null;

export function setColumns(columns) {
    columnsInstance = columns;
}

export function getColumns() {
    return columnsInstance;
}
