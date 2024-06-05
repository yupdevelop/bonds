import React, { useState, useEffect, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';
import 'antd/dist/antd.css';

const { Option } = Select;
const monthNames = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];

const getMonthName = (monthNumber) => monthNames[monthNumber - 1];

const moveItem = (data, from, to) => {
    if (to >= 0 && to < data.length) {
        const item = data.splice(from, 1)[0];
        data.splice(to, 0, item);
        return data;
    }
    return data;
};

const EditModal = ({ visible, onEdit, onCancel, bond }) => {
    const [form] = Form.useForm();

    useEffect(() => {
        if (bond) {
            form.setFieldsValue({
                ...bond,
                month: bond.month || [],
                coupon: bond.coupon ? String(bond.coupon) : '',
                portfolio: bond.portfolio ? String(bond.portfolio) : '',
            });
        }
    }, [bond, form]);

    return (
        <Modal
            title="Редактировать облигацию"
            visible={visible}
            onOk={() => {
                form
                    .validateFields()
                    .then((values) => {
                        onEdit(values);
                    })
                    .catch((info) => {
                        console.log('Validate Failed:', info);
                    });
            }}
            onCancel={onCancel}
        >
            <Form form={form} layout="vertical" name="editBond">
                <Form.Item name="name" label="Облигация" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="portfolio" label="В портфеле" rules={[{ required: true }]}>
                    <InputNumber />
                </Form.Item>
                <Form.Item name="month" label="Месяц" rules={[{ required: true, type: 'array' }]}>
                    <Select mode="multiple" placeholder="Выберите месяцы">
                        {monthNames.map((month, index) => (
                            <Option key={index} value={index + 1}>
                                {month}
                            </Option>
                        ))}
                    </Select>
                </Form.Item>
                <Form.Item name="coupon" label="Купон" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
            </Form>
        </Modal>
    );
};

const RecommendedBonds = ({ data, setHighlightedBonds }) => {
    const currentMonth = new Date().getMonth();

    const monthlyIncomes = data.reduce((acc, bond) => {
        bond.month.forEach(monthIndex => {
            const income = parseFloat(bond.coupon.replace(',', '.')) * bond.portfolio;
            acc[monthIndex - 1] = (acc[monthIndex - 1] || 0) + income;
        });
        return acc;
    }, new Array(12).fill(0));

    const uniqueIncomes = [...new Set(monthlyIncomes)].sort((a, b) => a - b);
    const lowestIncomes = uniqueIncomes.slice(0, 3);

    const recommendedBonds = data.filter(bond =>
        bond.month.some(monthIndex => lowestIncomes.includes(monthlyIncomes[monthIndex - 1]))
    );

    recommendedBonds.sort((a, b) => {
        const couponA = parseFloat(a.coupon.replace(',', '.'));
        const couponB = parseFloat(b.coupon.replace(',', '.'));
        if (couponA !== couponB) {
            return couponB - couponA;
        }

        const distanceA = a.month.reduce((acc, month) => Math.min(acc, (month + 11 - currentMonth) % 12), 12);
        const distanceB = b.month.reduce((acc, month) => Math.min(acc, (month + 11 - currentMonth) % 12), 12);
        return distanceA - distanceB;
    });

    const bondsToDisplay = recommendedBonds.slice(0, 3);

    return (
        <div className="recommended-bonds">
            <h3>Рекомендованные облигации</h3>
            <ul>
                {bondsToDisplay.map(bond => (
                    <li
                        key={bond.key}
                        onMouseEnter={() => setHighlightedBonds([bond.key])}
                        onMouseLeave={() => setHighlightedBonds([])}
                    >
                        {bond.name} ({bond.month.map(monthIndex => monthNames[monthIndex - 1]).join(', ')})
                    </li>
                ))}
            </ul>
        </div>
    );
};

const App = () => {
    const [data, setData] = useState(JSON.parse(localStorage.getItem('bondsData')) || []);
    const [editingBond, setEditingBond] = useState(null);
    const [highlightedBonds, setHighlightedBonds] = useState([]);
    const [highlightedMonths, setHighlightedMonths] = useState([]);

    useEffect(() => {
        localStorage.setItem('bondsData', JSON.stringify(data));
    }, [data]);

    const calculateAnnualIncome = (coupon, months, portfolio) => {
        if (!coupon || !months) {
            return '';
        }
        const annualIncome = parseFloat(coupon.replace(',', '.')) * months.length * portfolio;
        return annualIncome.toFixed(2).replace(',', '.');
    };

    const handleAdd = () => {
        const newBond = {
            key: Date.now(),
            name: '',
            portfolio: 1,
            month: [],
            coupon: '',
            payments: '',
        };
        setData([...data, newBond]);
        setEditingBond(newBond);
    };

    const handleEdit = (record) => {
        setEditingBond({ ...record });
    };

    const handleDelete = (key) => {
        const newData = data.filter((item) => item.key !== key);
        setData(newData);
    };

    const handleEditModalOk = (values) => {
        const newData = [...data];
        const index = newData.findIndex((item) => editingBond.key === item.key);
        newData.splice(index, 1, { ...editingBond, ...values, month: values.month || [] });
        setData(newData);
        setEditingBond(null);
    };

    const handleEditModalCancel = () => {
        setEditingBond(null);
    };

    const handleMoveUp = (key) => {
        const index = data.findIndex(item => item.key === key);
        const newData = moveItem([...data], index, index - 1);
        setData(newData);
        localStorage.setItem('bondsData', JSON.stringify(newData));
    };

    const handleMoveDown = (key) => {
        const index = data.findIndex(item => item.key === key);
        const newData = moveItem([...data], index, index + 1);
        setData(newData);
        localStorage.setItem('bondsData', JSON.stringify(newData));
    };

    const columns = [
        {
            title: 'Облигация',
            dataIndex: 'name',
            key: 'name',
        },
        {
            title: 'В портфеле',
            dataIndex: 'portfolio',
            key: 'portfolio',
        },
        {
            title: 'Месяц',
            dataIndex: 'month',
            key: 'month',
            render: (months) => months.map((month) => monthNames[month - 1]).join(', '),
        },
        {
            title: 'Купон',
            dataIndex: 'coupon',
            key: 'coupon',
        },
        {
            title: 'В год',
            key: 'annualIncome',
            render: (_, record) => Array.isArray(record.month)
                ? calculateAnnualIncome(record.coupon, record.month, record.portfolio)
                : '',
        },
        {
            title: 'Операции',
            key: 'operations',
            render: (_, record) => (
                <>
                    <Button
                        onClick={() => handleMoveUp(record.key)}
                        icon={<ArrowUpOutlined />}
                        className="operation-button"
                    />
                    <Button
                        onClick={() => handleMoveDown(record.key)}
                        icon={<ArrowDownOutlined />}
                        className="operation-button"
                    />
                    <Button
                        onClick={() => handleEdit(record)}
                        icon={<EditOutlined />}
                        className="operation-button"
                    />
                    <Button
                        onClick={() => handleDelete(record.key)}
                        icon={<DeleteOutlined />}
                        danger
                        className="operation-button"
                    />
                </>
            ),
        },
    ];

    const chartData = useMemo(() => {
        const monthlyIncome = new Array(12).fill(0);

        data.forEach((bond) => {
            if (bond.coupon && bond.month) {
                bond.month.forEach((monthIndex) => {
                    const monthIncome = parseFloat(bond.coupon.replace(',', '.')) * bond.portfolio;
                    monthlyIncome[monthIndex - 1] += monthIncome;
                });
            }
        });

        const datasetBackgroundColor = monthlyIncome.map((_, index) => (
            highlightedMonths.includes(index) ? 'rgba(255, 99, 132, 0.2)' : 'rgba(54, 162, 235, 0.2)'
        ));

        return {
            labels: monthNames,
            datasets: [{
                label: 'Доход',
                data: monthlyIncome.map(income => parseFloat(income.toFixed(2))),
                backgroundColor: datasetBackgroundColor,
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        };
    }, [data, highlightedMonths]);

    const onBarEnter = (index) => {
        const highlighted = data.reduce((acc, bond, bondIndex) => {
            if (bond.month.includes(index + 1)) {
                acc.push(bond.key);
            }
            return acc;
        }, []);

        setHighlightedBonds(highlighted);
    };

    const onBarLeave = () => {
        setHighlightedBonds([]);
    };

    const chartOptions = {
        scales: {
            y: {
                beginAtZero: true
            }
        },
        plugins: {
            legend: {
                display: true
            },
            tooltip: {
                enabled: true
            }
        },
        onHover: (event, elements) => {
            if (elements.length) {
                const index = elements[0].index;
                if (!highlightedMonths.includes(index)) {
                    setHighlightedMonths([index]);
                }
            } else if (highlightedMonths.length) {
                setHighlightedMonths([]);
            }
        }
    };

    const getRowClassName = (record) => {
        const isHighlighted = record.month.some(month => highlightedMonths.includes(month - 1)) || highlightedBonds.includes(record.key);
        return isHighlighted ? 'highlighted-row' : '';
    };

    return (
        <>
            <div className="container">
                <div className="table-container">
                    <Table
                        columns={columns}
                        dataSource={data}
                        pagination={false}
                        summary={pageData => {
                            let totalAnnualIncome = 0;
                            pageData.forEach(({ coupon, month, portfolio }) => {
                                totalAnnualIncome += parseFloat(coupon.replace(',', '.')) * month.length * portfolio;
                            });

                            return (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell colSpan={4}><strong>Итого</strong></Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        <strong>{totalAnnualIncome.toFixed(2).replace(',', '.')}</strong>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell>
                                        <Button onClick={handleAdd}>
                                            Добавить новую
                                        </Button>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            );
                        }}
                        onRow={(record) => ({
                            onMouseEnter: () => setHighlightedMonths(record.month.map(m => m - 1)),
                            onMouseLeave: () => setHighlightedMonths([]),
                        })}
                        rowClassName={getRowClassName}
                    />

                </div>
                <div className="right-column">
                    <div className="chart">
                        <Bar data={chartData} options={chartOptions} />
                    </div>
                    <RecommendedBonds data={data} setHighlightedBonds={setHighlightedBonds} />
                </div>
            </div>
            <EditModal
                visible={!!editingBond}
                onEdit={handleEditModalOk}
                onCancel={handleEditModalCancel}
                bond={editingBond}
            />
        </>
    );
};

export default App;