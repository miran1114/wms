import React, { useState, useEffect } from 'react';
import { Table, Card, Select, DatePicker, Input, Button, Space, Tag, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { OperationLog } from '../types/inventory';
import apiService from '../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

const OperationLogs: React.FC = () => {
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    operation_type: '',
    user: '',
    dateRange: null as any,
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  });

  const operationTypeMap = {
    'create': { text: '创建', color: 'green' },
    'update': { text: '更新', color: 'blue' },
    'delete': { text: '删除', color: 'red' },
    'import': { text: '导入', color: 'orange' },
    'export': { text: '导出', color: 'purple' }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        page_size: pagination.pageSize,
        operation_type: filters.operation_type || undefined,
        user: filters.user || undefined,
        search: filters.search || undefined,
        start_date: filters.dateRange?.[0]?.format('YYYY-MM-DD') || undefined,
        end_date: filters.dateRange?.[1]?.format('YYYY-MM-DD') || undefined
      };

      const response = await apiService.getOperationLogs(params);
      setLogs(response.data);
      setPagination(prev => ({ ...prev, total: response.total }));
    } catch (error) {
      message.error('获取操作日志失败');
      console.error('Failed to fetch operation logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [pagination.current, pagination.pageSize, filters]);

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
      total: pagination.total
    });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const handleRefresh = () => {
    fetchLogs();
  };

  const columns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (timestamp: string) => dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作类型',
      dataIndex: 'operation_type',
      key: 'operation_type',
      width: 100,
      render: (type: string) => {
        const config = operationTypeMap[type as keyof typeof operationTypeMap] || { text: type, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      width: 120
    },
    {
      title: '产品名称',
      dataIndex: 'item_name',
      key: 'item_name',
      width: 200
    },
    {
      title: '操作详情',
      dataIndex: 'details',
      key: 'details',
      render: (details: any, record: OperationLog) => {
        if (record.operation_type === 'update' && details) {
          const changes = Object.entries(details).map(([key, value]: [string, any]) => {
            const fieldMap: { [key: string]: string } = {
              'name': '名称',
              'quantity': '数量',
              'price': '价格',
              'category': '分类',
              'location': '位置',
              'supplier': '供应商',
              'min_quantity': '最小库存'
            };
            const fieldName = fieldMap[key] || key;
            return `${fieldName}: ${value.old} → ${value.new}`;
          });
          return <div>{changes.join(', ')}</div>;
        }
        return record.description || '-';
      }
    },
    {
      title: 'IP地址',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120
    }
  ];

  return (
    <div style={{ padding: '24px' }} className="fade-in">
      <Card title="操作日志" className="responsive-card">
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div className="responsive-search">
            <Input
              placeholder="搜索产品名称或用户"
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              style={{ width: 200 }}
              allowClear
              className="responsive-input"
            />
            <Select
              placeholder="操作类型"
              value={filters.operation_type}
              onChange={(value) => handleFilterChange('operation_type', value)}
              style={{ width: 120 }}
              allowClear
              className="responsive-select"
            >
              <Option value="">全部</Option>
              <Option value="create">创建</Option>
              <Option value="update">更新</Option>
              <Option value="delete">删除</Option>
              <Option value="import">导入</Option>
              <Option value="export">导出</Option>
            </Select>
            <RangePicker
              value={filters.dateRange}
              onChange={(dates) => handleFilterChange('dateRange', dates)}
              style={{ width: 240 }}
              className="responsive-picker"
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
              className="responsive-button"
            >
              刷新
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={logs}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条记录`
            }}
            onChange={handleTableChange}
            scroll={{ x: 1200 }}
            className="responsive-table"
            size="middle"
          />
        </Space>
      </Card>
    </div>
  );
};

export default OperationLogs;