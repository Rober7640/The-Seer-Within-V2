# REST API Documentation

The database is exposed as a REST API secured with an API key.

## Authentication

All API endpoints require authentication via API key. Include the key in your request headers:

```
X-API-Key: your_api_key_here
```

Or as a query parameter:
```
?api_key=your_api_key_here
```

## Base URL

```
/api/v1
```

## Endpoints

### Get All Conversations (with Universal Filtering)

```
GET /api/v1/conversations
```

**Query Parameters:** Any column name can be used as a filter!

**Examples:**
```
GET /api/v1/conversations?email=user@example.com
GET /api/v1/conversations?bucket=love
GET /api/v1/conversations?purchased=true
GET /api/v1/conversations?stripe_customer_id=cus_xxx
GET /api/v1/conversations?bucket=money&purchased=true
```

**Supported filter columns (both camelCase and snake_case):**
- `email`, `firstName`/`first_name`, `bucket`, `purchased`
- `stripeCustomerId`/`stripe_customer_id`
- `purchaseType`/`purchase_type`
- `upsellPurchased`/`upsell_purchased`
- `downsellPurchased`/`downsell_purchased`
- And all other columns in the database

**Response:**
```json
{
  "data": [...],
  "count": 10,
  "filters": ["bucket", "purchased"]
}
```

### Get Conversation by ID

```
GET /api/v1/conversations/:id
```

**Response:**
```json
{
  "data": { ... }
}
```

### Get Conversations by Email

```
GET /api/v1/conversations/email/:email
```

**Response:**
```json
{
  "data": [...],
  "count": 1
}
```

### Create Conversation

```
POST /api/v1/conversations
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "bucket": "love",
  "concern": "...",
  ...
}
```

**Response:**
```json
{
  "data": { ... }
}
```

### Update Conversation (Full)

```
PUT /api/v1/conversations/:id
```

**Request Body:** Full conversation object

### Update Conversation (Partial)

```
PATCH /api/v1/conversations/:id
```

**Request Body:** Only fields to update

### Delete Conversation

```
DELETE /api/v1/conversations/:id
```

**Response:**
```json
{
  "message": "Conversation deleted successfully"
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Invalid or missing API key"
}
```

### 404 Not Found
```json
{
  "error": "Conversation not found"
}
```

### 500 Server Error
```json
{
  "error": "Failed to fetch conversations"
}
```

## Available Fields

See `docs/DATABASE_FIELDS.md` for a complete list of conversation fields.
