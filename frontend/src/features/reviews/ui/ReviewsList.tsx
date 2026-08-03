import { Empty, List, Rate, Space, Typography } from 'antd';

import type { Review } from '@/features/reviews/api/reviewsApi';

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

interface ReviewsListProps {
  reviews: Review[];
  emptyDescription?: string;
}

export function ReviewsList({ reviews, emptyDescription = 'No reviews yet' }: ReviewsListProps) {
  if (reviews.length === 0) {
    return <Empty description={emptyDescription} />;
  }

  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

  return (
    <Space direction="vertical" style={{ display: 'flex' }}>
      <Space>
        <Rate disabled allowHalf value={average} />
        <Typography.Text type="secondary">
          {average.toFixed(1)} · {reviews.length} review{reviews.length === 1 ? '' : 's'}
        </Typography.Text>
      </Space>
      <List
        dataSource={reviews}
        renderItem={(review) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Space>
                  <Rate disabled value={review.rating} style={{ fontSize: 14 }} />
                  {review.client?.name}
                </Space>
              }
              description={
                <>
                  {review.comment}
                  {review.comment && ' · '}
                  {formatDate(review.createdAt)}
                </>
              }
            />
          </List.Item>
        )}
      />
    </Space>
  );
}
