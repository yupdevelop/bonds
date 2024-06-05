import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

const type = 'DraggableRow';

const DraggableRow = ({ index, moveRow, className, style, ...restProps }) => {
    const ref = useRef();

    const [, drop] = useDrop({
        accept: type,
        hover(item) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) {
                return;
            }
            moveRow(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
        drop(item, monitor) {
            if (!ref.current) {
                return;
            }
            const didDrop = monitor.didDrop();
            if (didDrop) {
                return;
            }
            moveRow(item.index, index);
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type,
        item: { type, index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <tr
            ref={ref}
            className={`${className} ${isDragging ? 'dragging' : ''}`}
            style={{ ...style, opacity: isDragging ? 0 : 1 }}
            {...restProps}
        />
    );
};

export default DraggableRow;