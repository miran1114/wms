import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Select, Tag, message, Modal } from 'antd';
import { EditOutlined, DeleteOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { InventoryItem, FilterOptions } from '../../types/inventory';
import { useInventoryStore } from '../../stores/inventoryStore';
import { formatCurrency, formatNumber, formatDateTime, formatStockStatus, getStockStatusColor } from '../../utils/formatters';
import { SORT_OPTIONS, SORT_ORDERS } from '../../utils/constants';
import StockOperationModal from './StockOperationModal';
import PriceEditModal from './PriceEditModal';
import NewProductModal from './NewProductModal';

const { Search } = Input;
const { Option } = Select;

interface InventoryTableProps {
  onProductClick?: (product: InventoryItem) => void;
}

const InventoryTable: React.FC<InventoryTableProps> = ({ onProductClick }) => {
  const {
    inventory,
    loading,
    filters,
    pagination,
    setFilters,
    setPagination,
    fetchInventory,
    deleteProduct,
  } = useInventoryStore();

  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [newProductModalVisible, setNewProductModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleSearch = (value: string) => {
    setFilters({ ...filters, search: value });
  };

  const handleSortChange = (sortBy: string) => {
    setFilters({ ...filters, sortBy: sortBy as FilterOptions['sortBy'] });
  };

  const handleSortOrderChange = (sortOrder: string) => {
    setFilters({ ...filters, sortOrder: sortOrder as FilterOptions['sortOrder'] });
  };

  const handleTableChange = (newPagination: any) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
  };

  const handleStockOperation = (product: InventoryItem) => {
    setSelectedProduct(product);
    setStockModalVisible(true);
  };

  const handlePriceEdit = (product: InventoryItem) => {
    setSelectedProduct(product);
    setPriceModalVisible(true);
  };

  const handleDelete = (product: InventoryItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除商品 "${product.name}" 吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await deleteProduct(product.id);
          message.success('商品删除成功');
        } catch (error) {
          message.error('删除商品失败');
        }
      },
    });
  };

  const handleProductClick = (product: InventoryItem) => {
    if (onProductClick) {
      onProductClick(product);
    }
  };

  const columns: ColumnsType<InventoryItem> = [
    {
      title: '商品信息',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (text: string, record: InventoryItem) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          <div style={{ fontSize: 12, color: '#666' }}>
            {record.sku && `SKU: ${record.sku}`}
            {record.category && ` | ${record.category}`}
          </div>
        </div>
      ),
    },
    {
      title: '库存数量',
      dataIndex: 'stock',
      key: 'stock',
      width: 120,
      sorter: true,
      render: (stock: number, record: InventoryItem) => (
        <div>
          <div style={{ fontWeight: 500 }}>
            {formatNumber(stock)} {record.unit}
          </div>
          <Tag 
            color={getStockStatusColor(stock, record.minSafetyStock)}
            style={{ marginTop: 4 }}
          >
            {formatStockStatus(stock, record.minSafetyStock)}
          </Tag>
        </div>
      ),
    },
    {
      title: '价格',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      sorter: true,
      render: (price: number) => (
        <span style={{ color: '#1890ff', fontWeight: 500 }}>
          {formatCurrency(price)}
        </span>
      ),
    },
    {
      title: '库存价值',
      key: 'value',
      width: 120,
      render: (record: InventoryItem) => (
        <span style={{ color: '#52c41a' }}>
          {formatCurrency(record.stock * record.price)}
        </span>
      ),
    },
    {
      title: '更新时间',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 150,
      sorter: true,
      render: (date: string) => formatDateTime(date),
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right',
      render: (record: InventoryItem) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => handleStockOperation(record)}
          >
            库存调整
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handlePriceEdit(record)}
          >
            改价
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="slide-up">
      <div className="search-section responsive-search">
        <Search
          placeholder="搜索商品名称或SKU"
          allowClear
          enterButton={<SearchOutlined />}
          style={{ width: 300 }}
          onSearch={handleSearch}
          defaultValue={filters.search}
          className="responsive-input"
        />
        
        <Select
          placeholder="排序字段"
          style={{ width: 120 }}
          onChange={handleSortChange}
          value={filters.sortBy}
          allowClear
          className="responsive-select"
        >
          {SORT_OPTIONS.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="排序方式"
          style={{ width: 100 }}
          onChange={handleSortOrderChange}
          value={filters.sortOrder}
          allowClear
          className="responsive-select"
        >
          {SORT_ORDERS.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>

        <div style={{ flex: 1 }} />
        
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setNewProductModalVisible(true)}
          className="responsive-button"
        >
          新增商品
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={inventory}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => 
            `第 ${range[0]}-${range[1]} 条/总共 ${total} 条`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
        rowClassName={(record) => 
          record.lowStockWarning ? 'low-stock-row' : ''
        }
        onRow={(record) => ({
          onClick: () => handleProductClick(record),
          style: { cursor: onProductClick ? 'pointer' : 'default' },
        })}
        className="responsive-table"
        size="middle"
      />

      <StockOperationModal
        visible={stockModalVisible}
        product={selectedProduct}
        onClose={() => {
          setStockModalVisible(false);
          setSelectedProduct(null);
        }}
      />

      <PriceEditModal
        visible={priceModalVisible}
        product={selectedProduct}
        onClose={() => {
          setPriceModalVisible(false);
          setSelectedProduct(null);
        }}
      />

      <NewProductModal
        visible={newProductModalVisible}
        onClose={() => {
          setNewProductModalVisible(false);
        }}
      />
    </div>
  );
};

export default InventoryTable;