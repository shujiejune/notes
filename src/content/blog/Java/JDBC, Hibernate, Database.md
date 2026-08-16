---
title: 'JDBC, Hibernate, Database'
description: 'Java database access with JDBC and Hibernate, plus database fundamentals.'
pubDate: 2026-07-24
tags: ['java', 'database', 'hibernate']
---
# JDBC, Hibernate, Database

## 1. What is SQL Injection? How to solve it?

It's an attack that happens when user input is directly appended to SQL query string and executed

How to solve:

- use parameterized query options such as `PreparedStatement` in JDBC or SessionAPI/Critera in Hibernate
  - Criteria API: the `CriteraBuilder` and `CriteriaQuery` use `PreparedStatement` under the hood
  - Session API: it uses HQL, and you must use named parameters or positional placeholders
- input sanitization can also help but parameterized query is preferred

## 2. Difference between `Statement` and `PreparedStatement`

| Interface   | `Statement` (legacy and unsafe)              | `PreparedStatement` (recommended)                                        | `CallableStatement` (specialized)                             |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Usage       | static SQL without parameters                | dynamic SQL with parameters                                              | execute database stored procedures                            |
| Performance | poor, re-compiles the SQL in every execution | excellent, pre-compiles the SQL once, only paramters are sent repeatedly | excellent, stored procedures are pre-compiled in the database |
| Security    | vulnerable to SQL injection attacks          | prevents SQL injection attacks                                           | prevents SQL injection attacks                                |

## 3. What are JDBC statements? List the types of JDBC statements and their usage.

`Statement` is used for one-time, static SQL queries.

`PreparedStatement` is used for repeated queries or queries with user input.

`CallableStatement` is used for executing stored procedures.

## 4. What is JdbcTemplate? And what are some of the advantages it has over standard JDBC?

It's the central class in Spring JDBC module.

Why use JdbcTemplate:

- **reduce boilerplate JDBC code:** do not need to manually try-catch-finally
- **simplify exception handling:** translates checked `SQLException` to runtime `DataAccessException`
- **easy integration with Spring-managed datasource:** use `RowMapper` interface

## 5. How to handle transactions manually in JDBC?

```java
Connection conn = null;
try {
    conn = dataSource.getConnection();
    // 1. Turn off Auto-Commit
    conn.setAutoCommit(false);

    // 2. Perform multiple operations
    updateInventory(conn, productId);
    processPayment(conn, userId);

    // 3. If everything is successful, COMMIT
    conn.commit();
} catch (Exception e) {
    // 4. If ANY operation fails, ROLLBACK the entire sequence
    if (conn != null) {
        try { conn.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
    }
} finally {
    if (conn != null) {
        try { conn.close(); } catch (SQLException e) { e.printStackTrace(); }
    }
}
```

## 6. What is ORM and what are its benefits?

Object-Relational Mapping is a programming technique that acts as a bridge between the object-oriented world of languages and the relational databases.

Benefits:

- **productivity:** reduce boilerplate code, e.g. just call `repository.save(user)`
- **maintainability:** if you rename a column, just change the mapping in the Java entity class
- **db independence:** ORM frameworks use dialects, if you want to move from MySQL to PostgreSQL, just change one line in the config and the ORM will automatically adjust the SQL syntax
- **type safety:** the compiler can catch errors

## 7. What is Hibernate? How to configure Hibernate?

Hibernate is an ORM tool. In addition to mapping tables and relationship to Java objects, it also does entity state management, connection management, and caching.

How to config:

- `application.properties` (modern)
  - dialect
  - driver class
  - url path
  - username and password
- `hibernate.cfg.xml` (legacy)

Difference between dialect and driver class:

- driver class provides details in establishing connection with db
- dialect provides details in how to translate HQL commands into db-specific SQL commands

## 8. What is `Session` and `SessionFactory` in Hibernate? Is `Session` in Hibernate thread-safe?

`Session` is a lightweight object that represents a single unit of work or a physical connection to db.

It's created every time you need to perform a db operation, and provides methods for CRUD.

It manages the first-level cache, remembering the loaded objects without fetching again from db.

Non-thread-safe, if 2 threads share the same session, they will overwrite each other's cache and cause `ConcurrentModificationException`.

short-lived.

`SessionFactory` is a heavy, thread-safe object that holds the config for entire db (mapping, dialect, and connection settings).

It's created once during app setup, one per db.

It acts as a factory for `Session` objects.

It lives as long as the app is running.

## 9. Difference between `getCurrentSession()` vs. `OpenSession()`

Obtain `Session` from `SessionFactory` in 2 ways

- `getCurrentSession()`
  - create a new session if not exists, else use the same session which is in the current Hibernate context
  - automatically flush and close the session
- `openSession()`
  - create a new session and give it to you
  - need to explicitly flush and close the session

## 10. What are the three Hibernate entity states?

Any entity instance (a Java object) in the app has 3 states:

- transient
  - never attached to a session
  - no corresponding rows in db
  - usually a new object you created to save to the db
- persistent
  - associated with a unique session
  - upon flushing the session to db, this entity is guaranteed to have a corresponding row
- detached
  - once attached to a session (in a persistent state) but currently not
  - an instance enters this state if you evict it from the context, clear or close the session, or put the instance through serialization / deserialization process

## 11. Difference between `get()` vs. `load()`

Both are methods of Session interface used to retrieve an object by its ID

- `get()` hits the db immediately, if found, returns the object, if not found, returns null
- `load()` is lazy, returns a proxy object that contains the id, only queries the db when a property is accessed. If not found, throws `ObjectNotFoundException`

## 12. Difference between `update()`, `merge()`, `saveOrUpdate()`

| Feature | `update()` | `merge()` | `saveOrUpdate()` |
| --- | --- | --- | --- |
| goal | transition an object from detached state to persistent state | merge state into a persistent object | insert or update based on id |
| return value | `void` | the persistent instance | `void` |
| new objects? | throws error if id is missing | creates a new record | creates a new record |
| session conflict | throws `NonUniqueObjectException` | handles it gracefully | throws `NonUniqueObjectException` |

## 13. Why do we use `flush()`, `clear()`, and `commit()`?

`flush()` syncs session data with db, is used to execute SQL immediately so that a subsequent query can see the results within the same transaction.

`clear()` detaches all objects currently managed by the session to prevent `OutOfMemoryError`, any changes that haven't been flushed will be lost.

`commit()` makes change in the db permanent and ends the transaction. All db locks are released.

## 14. How to do Many-to-Many mapping in Hibernate

```java
@Entity
public class Employee {
  @ManyToMany(cascade = { CascadeType.PERSIST, CascadeType.MERGE })
    @JoinTable(
        name = "employee_project", // Name of the join table
        joinColumns = @JoinColumn(name = "employee_id"), // Column for this entity
        inverseJoinColumns = @JoinColumn(name = "project_id") // Column for the other entity
    )
    private Set<Project> projects = new HashSet<>();
}

@Entity
public class Project {
  @ManyToMany(mappedBy = "projects") // Refers to the field name in Employee
    private Set<Employee> employees = new HashSet<>();
}
```

Use `Set` instead of `List` because if you remove one item from a `List`, Hibernate will delete all the rows in the join table and re-insert the remaining ones.

If you need extra data (e.g. `assigned_date`) in the join table, you need to break the Many-to-Many into 2 One-to-Many relationship with a new entity `ProjectAssignment`.

## 15. Give an example with `@ManyToOne` and `@OneToMany`

```java
public class Employee {
  @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;
}

public class Project {
  @OneToMany(mappedBy = "category", cascade = CascadeType.ALL, orphanRemoval = true)
  private Set<Employee> employees = new HashSet<>();

  public void addEmployee(Employee emp) {
    employees.add(emp);
    emp.setProject(this);
  }
}
```

Use `List` when you care about the insertion order.

## 16. Fetching strategy in Hibernate - Lazy (default) and Eager Fetching

- lazy fetching: data is loaded only when you explicitly access it, default for one-to-many and many-to-many (mark a relationship as `FetchType.LAZY`)
- eager fetching: data is loaded immediately along with the parent entity using a `JOIN`, default to many-to-one and one-to-one

`LazyInitializationException` occurs when

- you load an entity with a lazy relationship
- the Session is closed
- you try to access the lazy-loaded property

How to prevent:

- access before session is closed
- use eager fetching
- use `JOIN FETCH` in JPQL

## 17. Why is Hibernate often preferred over JDBC?

- In JDBC you have to manually translate every db row into Java object, but in Hibernate you define the mapping once with annotations.
- reduce boilerplate code, instead of opening connections, creating statements, iterating through `ResultSets`, and closing resources, you just perform `save()` in Hibernate
- db independency, you just need to change the dialect in config in Hibernate
- Hibernate uses first-level cache and lazy loading for better performance

## 18. What is HQL and what is `Criteria`? What is type safe?

They are 2 ways to retrieve data from db using Java objects instead of raw SQL tables.

- HQL is an object-oriented query language, similar to SQL but operates on persistent objects and their properties. Hibernate translates HQL to native SQL at runtime.
- Critera API is a programmatic, type-safe way to create queries, i.e. use Java methods to build the query. It's best for dynamic searches.

Type safety is preventing you from performing operations on wrong data types.

- HQL is not type-safe because the query is String.
- Criteria API is type-safe because you use actual Java objects and classes to build the query.

## 19. What are first-level cache and second-level cache and how are they accessed? If the second-level cache is enabled, how are the caches accessed (the order) when trying to fetch an entity?

- **L1 cache:** mandatory, always active
  - bound to the Session object, once Session is closed, the cache is lost
  - private to a single thread
  - Hibernate automatically stores every object it retrieves or saves in L1 cache
- **L2 cache:** optional, must be explicitly configured (using tools like Redis)
  - `SessionFactory`-level, shared across all sessions in the app
  - lives as long as the app lifecycle
  - effective for read-heavy data that doesn't change often

When you try to fetch an entity (calling `session.get()`):

- check L1 cache
- check L2 cache, if found, stores a copy in L1 cache
- cache miss, query the db
- after db returns the data, populates L1 and L2 cache

## 20. Explain ACID

- **Atomicity:** operations in a transaction should all succeed or all fail
- **Consistency:** before and after transactions the database should have consistent state
- **Isolation:** concurrent transactions do not interfere with each other
- **Durability:** committed transactions are persist to database, even in case of a system crash

## 21. Given an `Employee` table with `ID`, `Department`, and `Salary`, write a SQL query for:

a. Find the number of employees in each department.

```sql
SELECT Department, COUNT(*) AS EmpCount
FROM Employee
GROUP BY Department;
```

b. Get the highest salary per department group.

```sql
SELECT Department, MAX(Salary) AS MaxSalary
FROM Employee
GROUP BY Department;
```

c. Find the employees who have the top salary in each department.

```sql
SELECT ID, Department, Salary
FROM (
  SELECT ID, Department, Salary,
    RANK() OVER(PARTITION BY Department ORDER BY Salary DESC) AS rnk
  FROM Employee
) AS SalaryRank
WHERE rnk = 1;
```

d. Find all employees with the 3rd highest salary.

```sql
SELECT ID, Department, Salary
FROM (
  SELECT ID, Department, Salary
    DENSE_RANK() OVER(ORDER BY Salary DESC) AS rnk
  FROM Employee
) AS Ranking
WHERE rnk = 3;
```

Use `DENSE_RANK()` here to get the employee with the 3rd unique highest salary.

## 22. Explain SQL vs. NoSQL databases

| Feature | SQL | NoSQL |
| --- | --- | --- |
| data model | tables with fixed rows and columns | document, k-v pair, graph, wide-column |
| schema | static, rigid, defined before insertion | dynamic, flexible, can be changed on the fly |
| scaling | vertical: larger server | horizontal: add more servers to a cluster |
| relationship | good for complex joins and logic | poor for joins, data is denormalized |
| transaction | ACID (atomicity, consistency, isolation, duration) | BASE (basically available, soft state, eventual consistency) |

When to choose:

- relational:
  - complex transactions: when you need to ensure an operation completes entirely or not at all
  - structured data: when your data fits neatly into tables and rarely changes its structure
  - complex joins: if you need to perform analysis across multiple entities
- non-relational:
  - rapid development
  - big data & high volume
  - unstructured/semi-structured data: social media feeds, real-time sensor data, chat logs
  - caching

## 23. What is inner join, left join, right join?

- **inner join:** returns only the records that have matching values in both tables
- **left join:** returns all records from the left table, and matched records from the right table
- **right join:** returns all records from the right table, and matched records from the left table

## 24. What is CTE (common table expression)?

It's a temporary, named result set that you can reference within a `SELECT`, `INSERT`, `UPDATE`, or `DELETE` statement. It starts with `WITH`, followed by the name and query.

```sql
WITH SeniorEmployees AS (
  SELECT ID, Name, Salary
  FROM Employee
  WHERE Salary > 9000
)
SELECT * FROM SeniorEmployees;
```

Why use CTE:

- **readability:** don't need too many nested subqueries

```sql
-- Find departments where the average salary is higher than the overall company average

-- the hard way
SELECT Dept_Name, Avg_Dept_Salary
FROM (
    -- Subquery 1: Calculate Average per Department
    SELECT d.Name AS Dept_Name, AVG(e.Salary) AS Avg_Dept_Salary
    FROM Employee e
    JOIN Department d ON e.Dept_ID = d.ID
    GROUP BY d.Name
) AS DeptStats
WHERE Avg_Dept_Salary > (
    -- Subquery 2: Calculate Global Average (Redundant Logic)
    SELECT AVG(Salary) FROM Employee
)
ORDER BY Avg_Dept_Salary DESC;

-- the CTE way
-- Step 1: Define the Global Average once
WITH GlobalStats AS (
    SELECT AVG(Salary) as CompanyAvg FROM Employee
),

-- Step 2: Define Department Stats once
DeptStats AS (
    SELECT d.Name AS Dept_Name, AVG(e.Salary) AS Avg_Dept_Salary
    FROM Employee e
    JOIN Department d ON e.Dept_ID = d.ID
    GROUP BY d.Name
)

-- Step 3: Use the blocks to get the final answer
SELECT Dept_Name, Avg_Dept_Salary
FROM DeptStats, GlobalStats
WHERE Avg_Dept_Salary > CompanyAvg
ORDER BY Avg_Dept_Salary DESC;
```

- **avoiding redundancy:** if you need the same logic in the query twice, you can define it once in CTE

```sql
-- Find the top earner and bottom eaner of each department in a single row
WITH RankedSalary AS (
    SELECT Name, Dept_ID, Salary,
           ROW_NUMBER() OVER(PARTITION BY Dept_ID ORDER BY Salary DESC) as Highest,
           ROW_NUMBER() OVER(PARTITION BY Dept_ID ORDER BY Salary ASC) as Lowest
    FROM Employee
)
SELECT
    d.Name as Department,
    max(case when r.Highest = 1 then r.Name end) as Top_Earner,
    max(case when r.Lowest = 1 then r.Name end) as Bottom_Earner
FROM RankedSalary r
JOIN Department d ON r.Dept_ID = d.ID
GROUP BY d.Name;
```

- **recursive logic**

```sql
WITH RECURSIVE OrgChart AS (
  -- Anchor member: start with CEO
  SELECT ID, Name, ManagerID, 1 as Level
  FROM Employee
  WHERE ManagerID IS NULL

  UNION ALL

  -- Recursive member: find people who report to the previous level
  SELECT e.ID, e.Name, e.ManagerID, oc.Level + 1
  FROM Employee e
  INNER JOIN OrgChart oc ON e.ManagerID = oc.ID
)
SELECT * FROM OrgChart ORDER BY Level;
```

## 25. Explain the Stored Procedure and Trigger.

Stored procedure is a snippet of pre-compiled SQL code so you can save and reuse.

It must be explicitly called by the user or app.

It can accept input and return output.

Trigger is a special type of stored procedure that automatically runs when an event occurs in the db server.

```sql
CREATE TRIGGER Before_Employee_Update
BEFORE UPDATE ON Employee
FOR EACH ROW
BEGIN
    -- Log the old salary into an audit table before the update happens
    INSERT INTO Salary_Audit (Emp_ID, Old_Salary, Change_Date)
    VALUES (OLD.ID, OLD.Salary, NOW());
END;
```

## 26. What are the differences between a clustered index and a non-clustered index?

Clustered index defines the physical order in which the data is stored in the db

- leaf nodes of the clustered index contain the data rows
- one per table: since you can only sort the physical rows in one way
- primary key: most db automatically create a clustered index on the primary key

Non-clustered index contains the indexed columns and a pointer to the actual data

- index is a `Map`
- multiple per table, e.g. one for `email`, one for `phone_number`, one for `last_name`
- lookup overhead: first find the entry in the index, then follow the pointer to the actual row

## 27. What does window function do? What are the differences between `RANK()` and `DENSE_RANK()`?

Window function performs a calculation across a set of rows that are related to the current row.

It allows each row to retain its identity while still accessing data from other rows in its window.

`RANK()` assigns the same rank to tied rows, but skips the next ranking positions.

`DENSE_RANK()` assigns the same rank to tied rows, but doesn't skip the next ranking positions.

## 28. Based on insights from our monitoring tools indicating slow query performance, what strategies could be implemented to optimize it?

- add missing indexes
- `SELECT` attributes you need, avoid `SELECT *`
- optimize joins
- use `JOIN FETCH` to load collections in a single query rather than one-by-one

## 29. Explain CAP. Is MongoDB CP or AP?

CAP Theorem for distributed systems:

- **consistency:** every read receives the most recent write or an error. Have a single up-to-date copy of data across all nodes.
- **availability:** every request receives a non-error response, without the guarantee that it contains the most recent write. The system stays up even if some nodes are down.
- **partition tolerance:** the system continues to operate despite an arbitrary number of messages being dropped by the network between nodes.

MongoDB traditionally uses the single-master architecture, i.e. all writes go to the primary node, so it's CP. But modern MongoDB is tunable:

- if you config the app to use secondary reads, i.e. directing reads to the secondary (replica) nodes, it can be AP, but the reads might be stale.
- if you use majority write concern, i.e. a write is committed to a majority of nodes before confirming, ensuring highest consistency.

## 30. What are the two locking types in databases?

- **pessimistic locking:** it prevents conflicts by locking the data the moment it's accessed, so no one else can touch it until the transaction ends. Best for frequent conflicts system.

```sql
SELECT * FROM Employee WHERE ID = 101 FOR UPDATE;
```

- **optimistic locking:** it allows multiple users to read and modify data simultaneously, and only checks for a conflict at the moment the user tries to save. Best for low-contention systems.
  - apply the `@Version` on a field in the `Entity` class, and Hibernate will automatically include the version in the `WHERE` clause of every `UPDATE` statement and check the affected row count. If it's 0, it knows someone else updated the record and throws an `OptimisticLockException`.
